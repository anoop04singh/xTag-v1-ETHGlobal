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

  const facilitatorUrl = 'https://x402.polygon.technology';
  const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient, {
    facilitatorUrl: facilitatorUrl,
  });
  console.log(`[x402] Fetch wrapped with WalletClient and facilitator: ${facilitatorUrl}`);

  try {
    console.log(`[x402] Making initial request to ${fullUrl}`);
    const response = await fetchWithPayment(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Final response received from API with status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[x402] ERROR: Final response was not OK. Status: ${response.status}. Body:`, errorText);
        throw new Error(`Payment flow failed with status ${response.status}: ${errorText}`);
    }

    const paymentResponseHeader = response.headers.get('x-payment-response');
    let txHash = null;
    if (paymentResponseHeader) {
        const decodedHeader = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString('utf-8'));
        txHash = decodedHeader.txHash;
        console.log(`[x402] SUCCESS: Decoded x-payment-response header. Tx Hash: ${txHash}`);
    } else {
        console.log('[x402] SUCCESS: Access granted without a new payment (e.g., already owned).');
    }
    
    const data = await response.json();
    console.log('[x402] Successfully parsed final response JSON.');
    return { data, txHash };
  } catch (error) {
    console.error('[x402] CRITICAL ERROR during makePaidRequest:', error);
    throw error;
  }
}