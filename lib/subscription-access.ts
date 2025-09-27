import { prisma } from '@/lib/db';
import { parseUnits } from 'viem';
import { NextRequest } from 'next/server';

export async function getSubscriptionAccess(req: NextRequest, userId: string, subscriptionId: string) {
  console.log(`[ACCESS LIB] Checking access for user ${userId} to subscription ${subscriptionId}`);

  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { creator: true },
  });

  if (!subscription) {
    return { access: false, error: 'Subscription not found', status: 404 };
  }

  if (userId === subscription.creatorId) {
    console.log(`[ACCESS LIB] Access granted: User is the creator.`);
    return { access: true, prompt: subscription.prompt };
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_subscriptionId: { userId, subscriptionId } },
  });

  if (purchase) {
    console.log(`[ACCESS LIB] Access granted: User has a previous purchase record.`);
    return { access: true, prompt: subscription.prompt };
  }

  const paymentHeader = req.headers.get('x-payment');
  const resourceUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/subscriptions/${subscriptionId}/access`;
  const amountInSmallestUnit = parseUnits(subscription.price.toString(), 6);

  const paymentRequirements = {
    accepts: [{
      scheme: 'exact',
      network: 'polygon-amoy',
      resource: resourceUrl,
      description: `Premium content: ${subscription.name}`,
      mimeType: 'application/json',
      payTo: subscription.creator.walletAddress,
      maxAmountRequired: amountInSmallestUnit.toString(),
      maxTimeoutSeconds: 300,
      asset: process.env.USDC_CONTRACT_ADDRESS,
    }]
  };

  if (paymentHeader) {
    console.log("[ACCESS LIB] X-PAYMENT header found. Verifying with facilitator...");
    try {
      const facilitatorUrl = `${process.env.X402_FACILITATOR_URL}/verify`;
      const verificationResponse = await fetch(facilitatorUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x402Version: 1,
          paymentHeader,
          paymentRequirements: paymentRequirements.accepts[0],
        }),
      });

      const verificationResult = await verificationResponse.json();

      if (verificationResponse.ok && verificationResult.isValid) {
        console.log("[ACCESS LIB] Facilitator verification successful. Granting access.");
        return { access: true, prompt: subscription.prompt };
      } else {
        console.log("[ACCESS LIB] Facilitator verification failed:", verificationResult.invalidReason || 'Unknown reason');
      }
    } catch (error) {
        console.error("[ACCESS LIB] Error contacting facilitator:", error);
    }
  }

  console.log(`[ACCESS LIB] No valid payment proof. Returning 402 with payment requirements.`);
  return { access: false, paymentRequirements, status: 402 };
}