import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';

export async function makePaidRequest(userId: string, url: string, userToken: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const privateKey = decrypt(user.encryptedSignerKey);
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, account, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });

  const absoluteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${url}`;

  const response = await fetchWithPayment(absoluteUrl, {
    headers: {
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

  const txHash = response.headers.get('x-402-tx-hash');
  const data = await response.json();
  
  return { data, txHash };
}