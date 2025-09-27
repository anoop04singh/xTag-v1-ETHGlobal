import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { parseUnits } from 'viem';

type ProtectedHandler = (
  req: NextRequest,
  context: { params: { id: string } },
  options: { user: any; subscription: any; txHash?: string }
) => Promise<NextResponse | Response>;

export function paymentMiddleware(handler: ProtectedHandler) {
  return async function (req: NextRequest, { params }: { params: { id: string } }) {
    const subscriptionId = params.id;
    console.log(`\n--- [x402 Server Middleware] New Request for Subscription ID: ${subscriptionId} ---`);

    try {
      const user = await getCurrentUser(req);
      if (!user) {
        console.log("[x402 Server Middleware] Unauthorized: No user found for token.");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.log(`[x402 Server Middleware] Authenticated user: ${user.id}`);

      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { creator: true },
      });

      if (!subscription) {
        console.log(`[x402 Server Middleware] Subscription with ID ${subscriptionId} not found.`);
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }

      if (user.id === subscription.creatorId) {
        console.log(`[x402 Server Middleware] Access granted: User is the creator.`);
        return handler(req, { params }, { user, subscription });
      }

      const purchase = await prisma.purchase.findUnique({
        where: { userId_subscriptionId: { userId: user.id, subscriptionId } },
      });
      if (purchase) {
        console.log(`[x402 Server Middleware] Access granted: User has a previous purchase record.`);
        return handler(req, { params }, { user, subscription });
      }

      const paymentHeader = req.headers.get('x-payment');
      if (paymentHeader) {
        console.log("[x402 Server Middleware] X-PAYMENT header found. Verifying with facilitator...");
        const facilitatorUrl = 'https://x402.polygon.technology';
        
        const paymentPayload = {
            x402Version: 1,
            scheme: 'exact',
            network: 'polygon-amoy',
            resource: `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/${subscriptionId}/access`,
            description: `Premium content: ${subscription.name}`,
            mimeType: 'application/json',
            payTo: subscription.creator.walletAddress,
            maxAmountRequired: parseUnits(subscription.price.toString(), 6).toString(),
            maxTimeoutSeconds: 300,
            asset: process.env.USDC_CONTRACT_ADDRESS,
            extra: { name: "USD Coin", version: "2" }
        };

        const bodyForFacilitator = { paymentHeader, paymentPayload };

        try {
            const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyForFacilitator),
            });

            if (!verifyRes.ok) {
                const errorText = await verifyRes.text();
                console.error(`[x402 Server Middleware] Facilitator /verify returned an error. Status: ${verifyRes.status}. Body: ${errorText}`);
            } else {
                const verifyResult = await verifyRes.json();
                if (verifyResult.isValid) {
                    console.log("[x402 Server Middleware] Verification successful. Settling payment...");
                    const settleRes = await fetch(`${facilitatorUrl}/settle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(bodyForFacilitator),
                    });
                    const settleResult = await settleRes.json();
                    if (settleRes.ok && settleResult.success) {
                        console.log(`[x402 Server Middleware] Settlement successful. TxHash: ${settleResult.txHash}. Granting access.`);
                        return handler(req, { params }, { user, subscription, txHash: settleResult.txHash });
                    }
                }
            }
        } catch (e) {
            console.error("[x402 Server Middleware] Error communicating with facilitator:", e);
        }
      }

      console.log(`[x402 Server Middleware] No valid access method. Returning 402 Payment Required.`);
      const paymentRequirements = {
        x402Version: 1,
        accepts: [{
            scheme: 'exact',
            network: 'polygon-amoy',
            resource: `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/${subscriptionId}/access`,
            description: `Premium content: ${subscription.name}`,
            mimeType: 'application/json',
            payTo: subscription.creator.walletAddress,
            maxAmountRequired: parseUnits(subscription.price.toString(), 6).toString(),
            maxTimeoutSeconds: 300,
            asset: process.env.USDC_CONTRACT_ADDRESS,
            extra: { name: "USD Coin", version: "2" }
        }]
      };
      return new Response(JSON.stringify(paymentRequirements), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error(`[x402 Server Middleware] CRITICAL ERROR for subscription ${subscriptionId}:`, error);
      return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
    }
  };
}