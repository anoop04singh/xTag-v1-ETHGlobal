import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';
import { getSubscriptionAccess } from './subscription-access';
import { verifyToken } from './auth';

// This function simulates a `fetch` call by directly calling our internal business logic.
// It avoids the server-to-server HTTP request that was causing the timeout.
async function internalApiFetcher(url: string, options?: RequestInit): Promise<Response> {
  console.log(`[x402-internal] Intercepted request for URL: ${url}`);
  const urlParts = url.split('/');
  const subscriptionId = urlParts[urlParts.length - 2]; // Assumes URL is /api/subscriptions/{id}/access

  const authHeader = options?.headers?.['Authorization'];
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const token = authHeader.substring(7);
  const decodedUser = verifyToken(token);
  if (!decodedUser) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
  }

  const result = await getSubscriptionAccess(decodedUser.id, subscriptionId);

  if (result.access) {
    return new Response(JSON.stringify({ prompt: result.prompt }), { status: 200 });
  } else if (result.status === 402) {
    return new Response(JSON.stringify(result.paymentRequirements), { status: 402 });
  } else {
    return new Response(JSON.stringify({ error: result.error }), { status: result.status || 500 });
  }
}

export async function makePaidRequest(userId: string, url: string, userToken: string) {
  console.log(`[x402] Initiating paid request for user ${userId} to internal resource: ${url}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402] Decrypted private key for smart wallet: ${user.smartAccountAddress}`);

  // Use our internalApiFetcher instead of the global `fetch` to prevent timeouts.
  const fetchWithPayment = wrapFetchWithPayment(internalApiFetcher, account, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with payment logic using facilitator: ${process.env.X402_FACILITATOR_URL}`);

  try {
    const response = await fetchWithPayment(url, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Response received from internal flow with status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[x402] ERROR: Payment failed or was rejected. Status: ${response.status}`, errorData);
      throw new Error(errorData.error || `Payment failed with status ${response.status}.`);
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