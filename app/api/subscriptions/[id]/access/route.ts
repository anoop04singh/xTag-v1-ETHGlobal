import { NextResponse, NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/currentUser';
import { getSubscriptionAccess } from '@/lib/subscription-access';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log(`\n--- [ACCESS API] New Request for Subscription ID: ${params.id} ---`);
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.log("[ACCESS API] Unauthorized: No user found for token.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[ACCESS API] Authenticated user: ${user.id}`);

    const subscriptionId = params.id;
    const result = await getSubscriptionAccess(user.id, subscriptionId);

    if (result.access) {
      console.log(`[ACCESS API] Access GRANTED for user ${user.id} to subscription ${subscriptionId}.`);
      return NextResponse.json({ prompt: result.prompt });
    } else if (result.status === 402) {
      console.log(`[ACCESS API] Access DENIED. Returning 402 Payment Required with 'accepts' structure.`);
      // The result.paymentRequirements object is now { accepts: [...] }
      return new Response(JSON.stringify(result.paymentRequirements), {
        status: 402,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.log(`[ACCESS API] Error checking access: ${result.error}`);
      return NextResponse.json({ error: result.error }, { status: result.status || 500 });
    }
  } catch (error) {
    console.error(`[ACCESS API] CRITICAL ERROR for subscription ${params.id}:`, error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}