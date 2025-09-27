import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = params.id;
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { creator: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Check if the user has already purchased this subscription or is the creator
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_subscriptionId: {
          userId: user.id,
          subscriptionId: subscriptionId,
        },
      },
    });

    if (purchase || user.id === subscription.creatorId) {
      // User has access, return the premium content
      return NextResponse.json({ prompt: subscription.prompt });
    }

    // User does not have access, return 402 Payment Required
    const paymentRequirements = {
      accepts: [{
        scheme: 'exact',
        network: 'polygon-amoy',
        asset: 'usdc',
        payTo: subscription.creator.smartAccountAddress,
        maxAmountRequired: subscription.price.toString(),
        maxTimeoutSeconds: 300,
        extra: {
          name: subscription.name,
          description: subscription.description,
        },
      }],
    };

    return new Response(JSON.stringify(paymentRequirements), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error('Error accessing subscription:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}