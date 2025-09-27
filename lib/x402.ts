import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { createSmartAccountClient, type SmartAccountClientOptions } from "@biconomy/account";
import { polygonAmoy } from "viem/chains";
import { decrypt } from './encryption';
import { prisma } from './db';

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
  const biconomyWalletClient = await createSmartAccountClient(config);

  // x402-fetch can accept a `sendTransaction` function directly.
  // We provide the one from our Biconomy client, ensuring it handles UserOps and Paymaster logic.
  const sendTransaction = biconomyWalletClient.sendTransaction.bind(biconomyWalletClient);

  const fetchWithPayment = wrapFetchWithPayment(fetch, sendTransaction, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with Biconomy's sendTransaction and facilitator: ${process.env.X402_FACILITATOR_URL}`);

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