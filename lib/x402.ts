import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';

export async function makePaidRequest(userId: string, url: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Decrypt the user's signer key to make the payment
  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(`0x${privateKey}`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, account, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });

  // The base URL for fetch needs to be absolute on the server-side
  const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`;

  const response = await fetchWithPayment(absoluteUrl, {
    headers: {
      // We need to forward the original user's token to the resource endpoint
      'Authorization': `Bearer ${user.id}`, 
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Payment failed or was rejected.');
  }

  return response.json();
}