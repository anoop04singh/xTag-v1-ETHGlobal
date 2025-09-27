import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from "viem/chains";
import { decrypt } from './encryption';
import { prisma } from './db';
import { createWalletClient, http } from 'viem';

export async function makePaidRequest(userId: string, relativeUrl: string, userToken: string) {
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${relativeUrl}`;
  console.log(`[x402] Initiating paid request for user ${userId} to: ${fullUrl}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402] Decrypted private key for wallet: ${account.address}`);

  const walletClient = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(process.env.POLYGON_AMOY_RPC_URL!),
  });
  console.log(`[x402] Standard viem WalletClient created for address: ${walletClient.account.address}`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with standard WalletClient and facilitator: ${process.env.X402_FACILITATOR_URL}`);

  try {
    // The wrapFetchWithPayment function will handle the 402 response internally.
    // It will only return here once the payment is successful (with a 200 OK)
    // or it will throw an error if the on-chain transaction fails.
    const response = await fetchWithPayment(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Response received from API with status: ${response.status}`);

    // The premature error check has been removed. The library now handles the 402 flow.
    // If we get here, it means the final response was successful (e.g., 200 OK).

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
    // Re-throw the error so the calling function can handle it.
    throw error;
  }
}