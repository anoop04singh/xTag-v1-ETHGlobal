import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';

export async function makePaidRequest(userId: string, url: string, userToken: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // 1. Decrypt the user's private key to control their smart account for the transaction.
  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // 2. Wrap the standard 'fetch' with x402 payment logic.
  // This uses the user's account to sign the transaction via the facilitator.
  const fetchWithPayment = wrapFetchWithPayment(fetch, account, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });

  const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`;

  // 3. Make the request. If payment is required (402), x402-fetch handles the on-chain transaction.
  const response = await fetchWithPayment(absoluteUrl, {
    headers: {
      // Forward the user's JWT to the resource endpoint for authorization.
      'Authorization': `Bearer ${userToken}`,
    },
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment failed or was rejected.');
    } catch {
      throw new Error(`Payment failed with status ${response.status}.`);
    }
  }

  // 4. On success, the facilitator includes the on-chain transaction hash in the headers.
  const txHash = response.headers.get('x-402-tx-hash');
  const data = await response.json();
  
  // 5. Return the premium content AND the transaction hash as proof.
  return { data, txHash };
}