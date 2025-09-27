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
  console.log(`[x402] Viem WalletClient created for address: ${walletClient.account.address}`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with WalletClient and facilitator: ${process.env.X402_FACILITATOR_URL}`);

  try {
    const response = await fetchWithPayment(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Final response received from API with status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[x402] ERROR: Final response was not OK. Status: ${response.status}`, errorText);
        throw new Error(`Payment flow failed with status ${response.status}: ${errorText}`);
    }

    const paymentResponseHeader = response.headers.get('x-payment-response');
    let txHash = null;
    if (paymentResponseHeader) {
        txHash = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString('utf-8')).txHash;
        console.log(`[x402] SUCCESS: On-chain transaction confirmed. Tx Hash: ${txHash}`);
    } else {
        console.log('[x402] SUCCESS: Access granted. This may be a previously owned item.');
    }
    
    const data = await response.json();
    return { data, txHash };
  } catch (error) {
    console.error('[x402] CRITICAL ERROR during makePaidRequest:', error);
    throw error;
  }
}