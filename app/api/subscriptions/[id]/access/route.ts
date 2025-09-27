import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/currentUser';
import { getSubscriptionAccess } from '@/lib/subscription-access';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = params.id;
    const result = await getSubscriptionAccess(user.id, subscriptionId);

    if (result.access) {
      return NextResponse.json({ prompt: result.prompt });
    } else if (result.status === 402) {
      return new Response(JSON.stringify(result.paymentRequirements), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }
  } catch (error) {
    console.error(`[ACCESS API] Error accessing subscription ${params.id}:`, error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}