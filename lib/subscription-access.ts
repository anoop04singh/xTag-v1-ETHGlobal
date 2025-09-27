import { prisma } from '@/lib/db';
import { parseUnits } from 'viem';
import crypto from 'crypto';

export async function getSubscriptionAccess(userId: string, subscriptionId: string) {
  console.log(`[ACCESS LIB] Checking access for user ${userId} to subscription ${subscriptionId}`);

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { creator: true },
  });

  if (!subscription) {
    console.log(`[ACCESS LIB] Subscription not found: ${subscriptionId}`);
    return { access: false, error: 'Subscription not found', status: 404 };
  }

  // Check if the user is the creator
  if (userId === subscription.creatorId) {
    console.log(`[ACCESS LIB] Access granted: User is the creator.`);
    return { access: true, prompt: subscription.prompt };
  }

  // Check if the user has already purchased this subscription
  const purchase = await prisma.purchase.findUnique({
    where: {
      userId_subscriptionId: {
        userId: userId,
        subscriptionId: subscriptionId,
      },
    },
  });

  if (purchase) {
    console.log(`[ACCESS LIB] Access granted: User has a previous purchase record.`);
    return { access: true, prompt: subscription.prompt };
  }

  // User does not have access, return payment requirements
  console.log(`[ACCESS LIB] Access denied. Returning payment requirements that match the x402-fetch schema.`);
  
  // Assuming USDC has 6 decimals, which is standard.
  const amountInSmallestUnit = parseUnits(subscription.price.toString(), 6);
  const resourceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscriptions/${subscriptionId}/access`;

  const paymentRequirements = {
    x402Version: 1,
    error: null,
    accepts: [{
      scheme: 'exact',
      network: 'polygon-amoy',
      asset: process.env.USDC_CONTRACT_ADDRESS,
      payTo: subscription.creator.smartAccountAddress,
      maxAmountRequired: amountInSmallestUnit.toString(),
      maxTimeoutSeconds: 300,
      resource: resourceUrl,
      description: `Payment for access to "${subscription.name}"`,
      nonce: crypto.randomBytes(16).toString('hex')
    }],
  };

  return { access: false, paymentRequirements, status: 402 };
}