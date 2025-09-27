import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient, type SmartAccountClientOptions } from "@biconomy/account";
import { polygonAmoy } from "viem/chains";
import { decrypt } from './encryption';
import { prisma } from './db';
import { type WalletClient } from 'viem';

export async function makePaidRequest(userId: string, relativeUrl: string, userToken: string) {
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${relativeUrl}`;
  console.log(`[x402] Initiating paid request for user ${userId} to: ${fullUrl}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const privateKey = decrypt(user.encryptedSignerKey);
  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402] Decrypted private key for smart wallet: ${user.smartAccountAddress}`);

  const config: SmartAccountClientOptions = {
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL!,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL!,
    chainId: polygonAmoy.id,
  };
  if (process.env.BICONOMY_PAYMASTER_API_KEY) {
    config.biconomyPaymasterApiKey = process.env.BICONOMY_PAYMASTER_API_KEY;
  }
  const biconomySmartAccount = await createSmartAccountClient(config);

  // Create a Viem-compatible WalletClient adapter for x402-fetch
  const walletClientAdapter = {
    account: {
      address: user.smartAccountAddress as `0x${string}`,
      type: 'local' as const,
    },
    chain: polygonAmoy,
    sendTransaction: biconomySmartAccount.sendTransaction.bind(biconomySmartAccount),
    // Add dummy properties and functions to satisfy the WalletClient type expected by x402-fetch
    key: 'biconomy-adapter',
    type: 'biconomy-adapter',
    transport: { key: 'http', name: 'HTTP JSON-RPC', type: 'http', retryCount: 0, retryDelay: 150, timeout: 10000 },
    writeContract: () => { throw new Error('writeContract not implemented on adapter'); },
    addChain: () => { throw new Error('addChain not implemented on adapter'); },
    deployContract: () => { throw new Error('deployContract not implemented on adapter'); },
    getAddresses: () => { throw new Error('getAddresses not implemented on adapter'); },
    getChainId: async () => Promise.resolve(polygonAmoy.id),
    getPermissions: () => { throw new Error('getPermissions not implemented on adapter'); },
    requestAddresses: () => { throw new Error('requestAddresses not implemented on adapter'); },
    requestPermissions: () => { throw new Error('requestPermissions not implemented on adapter'); },
    signMessage: () => { throw new Error('signMessage not implemented on adapter'); },
    signTypedData: () => { throw new Error('signTypedData not implemented on adapter'); },
    switchChain: () => { throw new Error('switchChain not implemented on adapter'); },
    watchAsset: () => { throw new Error('watchAsset not implemented on adapter'); },
    sendRawTransaction: () => { throw new Error('sendRawTransaction not implemented on adapter'); },
    signTransaction: () => { throw new Error('signTransaction not implemented on adapter'); },
    call: () => { throw new Error('call not implemented on adapter'); },
    estimateGas: () => { throw new Error('estimateGas not implemented on adapter'); },
  } as unknown as WalletClient;

  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClientAdapter, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with Biconomy client adapter and facilitator: ${process.env.X402_FACILITATOR_URL}`);

  try {
    const response = await fetchWithPayment(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Response received from API with status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[x402] ERROR: Payment failed or was rejected. Status: ${response.status}`, errorText);
      throw new Error(`Payment failed: ${errorText}`);
    }

    const txHash = response.headers.get('x-402-tx-hash');
    if (txHash) {
      console.log(`[x402] SUCCESS: On-chain transaction confirmed. Tx Hash: ${txHash}`);
    } else {
      console.log('[x402] SUCCESS: Access granted without a new transaction (user likely already owns the item).');
    }
    
    const data = await response.json();
    return { data, txHash };
  } catch (error) {
    console.error('[x402] CRITICAL ERROR during makePaidRequest:', error);
    throw error;
  }
}