import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { Prisma } from '@prisma/client';

// GET all subscriptions for discovery, and user's own for management
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: { id: true, smartAccountAddress: true }
        }
      }
    });

    const purchases = await prisma.purchase.findMany({
        where: { userId: user.id },
        select: { subscriptionId: true }
    });
    const purchasedIds = new Set(purchases.map(p => p.subscriptionId));

    const subscriptionsWithOwnership = subscriptions.map(sub => ({
        ...sub,
        isOwned: purchasedIds.has(sub.id) || sub.creatorId === user.id
    }));

    return NextResponse.json(subscriptionsWithOwnership);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

// POST to create a new subscription
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, prompt, price } = await request.json();
    if (!name || !description || !prompt || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newSubscription = await prisma.subscription.create({
      data: {
        name,
        description,
        prompt,
        price: new Prisma.Decimal(price),
        creatorId: user.id,
      },
    });

    return NextResponse.json(newSubscription, { status: 201 });
  }
};