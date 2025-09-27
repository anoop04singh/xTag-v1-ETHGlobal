import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const subscriptionId = params.id;
  console.log(`[ACCESS API] Received request for subscription ID: ${subscriptionId}`);

  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.log('[ACCESS API] Unauthorized: No user found for token.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[ACCESS API] Authenticated user: ${user.id}`);

    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { creator: true },
    });

    if (!subscription) {
      console.log(`[ACCESS API] Subscription not found: ${subscriptionId}`);
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if the user is the creator
    if (user.id === subscription.creatorId) {
      console.log(`[ACCESS API] Access granted: User is the creator of subscription "${subscription.name}".`);
      return NextResponse.json({ prompt: subscription.prompt });
    }

    // Check if the user has already purchased this subscription
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_subscriptionId: {
          userId: user.id,
          subscriptionId: subscriptionId,
        },
      },
    });

    if (purchase) {
      console.log(`[ACCESS API] Access granted: User has a previous purchase record for subscription "${subscription.name}".`);
      return NextResponse.json({ prompt: subscription.prompt });
    }

    // User does not have access, return 402 Payment Required
    console.log(`[ACCESS API] Access denied for user ${user.id}. Returning 402 Payment Required.`);
    const paymentRequirements = {
      accepts: [{
        scheme: 'exact',
        network: 'polygon-amoy',
        asset: subscription.currency.toLowerCase(),
        payTo: subscription.creator.smartAccountAddress,
        maxAmountRequired: subscription.price.toString(),
        maxTimeoutSeconds: 300,
        extra: {
          name: subscription.name,
          description: subscription.description,
        },
      }],
    };
    console.log('[ACCESS API] Sending 402 with details:', paymentRequirements);

    return new Response(JSON.stringify(paymentRequirements), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error(`[ACCESS API] Error accessing subscription ${subscriptionId}:`, error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}