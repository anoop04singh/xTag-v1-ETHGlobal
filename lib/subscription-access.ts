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
    console.log(`[ACCESS LIB] Subscription with ID ${subscriptionId} not found.`);
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
      extra: { name: "USD Coin", version: "2" }
    }]
  };

  if (paymentHeader) {
    console.log("[ACCESS LIB] X-PAYMENT header found. Attempting to verify and settle...");
    try {
      const facilitatorUrl = 'https://x402.polygon.technology';
      console.log(`[ACCESS LIB] Using facilitator: ${facilitatorUrl}`);

      const finalBodyForFacilitator = {
        x402Version: 1,
        paymentHeader: paymentHeader,
        paymentPayload: paymentRequirements.accepts[0], // Corrected key from paymentRequirements to paymentPayload
      };
      console.log("[ACCESS LIB] Body prepared for facilitator:", JSON.stringify(finalBodyForFacilitator, null, 2));

      // Step 1: Verify the payment payload
      console.log("[ACCESS LIB] Calling facilitator /verify endpoint...");
      const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBodyForFacilitator),
      });
      
      const verifyResultText = await verifyRes.text();
      console.log(`[ACCESS LIB] Facilitator /verify responded with status ${verifyRes.status} and body: ${verifyResultText}`);

      if (!verifyRes.ok) {
        console.error(`[ACCESS LIB] Facilitator /verify returned a non-OK status.`);
      } else {
        const verifyResult = JSON.parse(verifyResultText);
        if (!verifyResult.isValid) {
          console.log("[ACCESS LIB] Facilitator verification failed:", verifyResult.invalidReason || 'Unknown reason');
        } else {
          console.log("[ACCESS LIB] Verification successful. Calling facilitator /settle endpoint...");
          
          // Step 2: Settle the payment
          const settleRes = await fetch(`${facilitatorUrl}/settle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalBodyForFacilitator),
          });
          const settleResultText = await settleRes.text();
          console.log(`[ACCESS LIB] Facilitator /settle responded with status ${settleRes.status} and body: ${settleResultText}`);
          
          if (settleRes.ok) {
            const settleResult = JSON.parse(settleResultText);
            if (settleResult.success) {
              console.log(`[ACCESS LIB] Settlement successful. TxHash: ${settleResult.txHash}. Granting access.`);
              return { access: true, prompt: subscription.prompt, txHash: settleResult.txHash };
            } else {
               console.error("[ACCESS LIB] Facilitator settlement failed:", settleResult.error || 'Settlement returned success:false.');
            }
          } else {
            console.error("[ACCESS LIB] Facilitator /settle returned a non-OK status.");
          }
        }
      }
    } catch (error) {
      console.error("[ACCESS LIB] Error during facilitator communication:", error);
    }
  }

  console.log(`[ACCESS LIB] No valid payment proof. Returning 402 with payment requirements:`, JSON.stringify(paymentRequirements, null, 2));
  return { access: false, paymentRequirements, status: 402 };
}