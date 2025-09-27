import { wrapFetchWithPayment } from 'x402-fetch';
import { privateKeyToAccount } from 'viem/accounts';
import { decrypt } from './encryption';
import { prisma } from './db';
import { createSmartAccountClient } from '@biconomy/account';

export async function makePaidRequest(userId: string, relativeUrl: string, userToken: string) {
  const fullUrl = `${process.env.NEXT_PUBLIC_APP_URL}${relativeUrl}`;
  console.log(`[x402] Initiating paid request for user ${userId} to: ${fullUrl}`);
  
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const privateKey = decrypt(user.encryptedSignerKey);
  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`[x402] Decrypted private key for signer: ${signer.address}`);

  const biconomySmartAccount = await createSmartAccountClient({
    signer,
    bundlerUrl: process.env.BICONOMY_BUNDLER_URL!,
  });
  const smartAccountAddress = await biconomySmartAccount.getAccountAddress();
  console.log(`[x402] Biconomy smart account client created for address: ${smartAccountAddress}`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, biconomySmartAccount, {
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
  });
  console.log(`[x402] Fetch wrapped with Biconomy smart account and facilitator: ${process.env.X402_FACILITATOR_URL}`);

  try {
    const response = await fetchWithPayment(fullUrl, {
      headers: { 'Authorization': `Bearer ${userToken}` },
    });

    console.log(`[x402] Response received from API with status: ${response.status}`);

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