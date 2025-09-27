import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';

export async function makePaidRequest(userId: string, url: string, userToken: string) {
  console.log(`[x402] Initiating paid request for user ${userId} to URL: ${url}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.error(`[x402] ERROR: User not found for ID: ${userId}`);
    throw new Error('User not found');
  }

  // 1. Decrypt the user's private key
  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402] Decrypted private key and created Viem account for smart wallet: ${user.smartAccountAddress}`);

  // 2. Wrap 'fetch' with x402 payment logic
  const fetchWithPayment = wrapFetchWithPayment(fetch, account, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with payment logic using facilitator: ${process.env.X402_FACILITATOR_URL}`);

  const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`;

  try {
    // 3. Make the request
    console.log(`[x402] Making initial request to: ${absoluteUrl}`);
    const response = await fetchWithPayment(absoluteUrl, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
      },
    });

    console.log(`[x402] Response received with status: ${response.status}`);

    if (!response.ok) {
      try {
        const errorData = await response.json();
        console.error(`[x402] ERROR: Payment failed or was rejected by the server. Status: ${response.status}`, errorData);
        throw new Error(errorData.error || `Payment failed with status ${response.status}.`);
      } catch (e) {
        console.error(`[x402] ERROR: Payment failed with status ${response.status}. Could not parse error JSON.`);
        throw new Error(`Payment failed with status ${response.status}.`);
      }
    }

    // 4. On success, get the transaction hash
    const txHash = response.headers.get('x-402-tx-hash');
    if (txHash) {
      console.log(`[x402] SUCCESS: On-chain transaction confirmed. Tx Hash: ${txHash}`);
    } else {
      console.log('[x402] SUCCESS: Access granted without a new transaction (user likely already owns the item).');
    }
    
    const data = await response.json();
    
    // 5. Return the premium content and the transaction hash
    return { data, txHash };
  } catch (error) {
    console.error('[x402] CRITICAL ERROR during makePaidRequest:', error);
    throw error; // Re-throw the error to be caught by the chat API
  }
}