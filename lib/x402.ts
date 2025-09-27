import axios from 'axios';
import { withPaymentInterceptor } from 'x402-axios';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';

export async function makePaidRequest(userId: string, relativeUrl: string, userToken: string) {
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${relativeUrl}`;
  console.log(`[x402-axios] Initiating paid request for user ${userId} to: ${fullUrl}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402-axios] Decrypted private key for wallet: ${account.address}`);

  const axiosInstance = axios.create();
  
  const axiosWithPayment = withPaymentInterceptor(
    axiosInstance, 
    account,
    (requirements) => requirements[0] // Explicitly provide a selector function
  );
  console.log(`[x402-axios] Axios wrapped with payment interceptor and a selector.`);

  try {
    console.log(`[x402-axios] Making initial request to ${fullUrl}`);
    const response = await axiosWithPayment.get(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402-axios] Final response received from API with status: ${response.status}`);

    if (response.status !== 200) {
        console.error(`[x402-axios] ERROR: Final response was not OK. Status: ${response.status}. Body:`, response.data);
        throw new Error(`Payment flow failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const paymentResponseHeader = response.headers['x-payment-response'];
    let txHash = null;
    if (paymentResponseHeader) {
        const decodedHeader = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString('utf-8'));
        txHash = decodedHeader.txHash;
        console.log(`[x402-axios] SUCCESS: Decoded x-payment-response header. Tx Hash: ${txHash}`);
    } else {
        console.log('[x402-axios] SUCCESS: Access granted without a new payment (e.g., already owned).');
    }
    
    const data = response.data;
    console.log('[x402-axios] Successfully parsed final response data.');
    return { data, txHash };
  } catch (error) {
    console.error('[x402-axios] CRITICAL ERROR during makePaidRequest:', error);
    if (axios.isAxiosError(error) && error.response) {
        console.error('[x402-axios] Axios error response data:', error.response.data);
    }
    throw error;
  }
}