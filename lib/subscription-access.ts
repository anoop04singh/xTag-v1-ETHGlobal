import { prisma } from '@/lib/db';

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
  console.log(`[ACCESS LIB] Access denied. Returning payment requirements.`);
  
  const resourceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscriptions/${subscriptionId}/access`;

  const paymentRequirements = {
    resource: resourceUrl,
    description: subscription.description,
    mimeType: 'application/json',
    accepts: [{
      scheme: 'exact',
      network: 'polygon-amoy',
      asset: subscription.currency.toLowerCase(),
      payTo: subscription.creator.smartAccountAddress,
      maxAmountRequired: subscription.price.toString(),
      maxTimeoutSeconds: 300,
    }],
  };

  return { access: false, paymentRequirements, status: 402 };
}