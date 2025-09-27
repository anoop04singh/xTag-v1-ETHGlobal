import { NextResponse, NextRequest } from 'next/server';
import { withX402Protection } from '@/lib/withX402Protection';

// This is the core logic that runs ONLY after access has been granted.
const accessHandler = async (
  req: NextRequest,
  context: { params: { id: string } },
  options: { user: any; subscription: any; txHash?: string }
) => {
  const { subscription, txHash } = options;
  console.log(`[ACCESS API] Access GRANTED for subscription ${subscription.id}. Returning premium prompt.`);

  const headers = new Headers();
  // If there was a transaction, include the hash in the response header for the client.
  if (txHash) {
    headers.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify({ txHash })).toString('base64'));
  }

  return new Response(JSON.stringify({ prompt: subscription.prompt }), {
    status: 200,
    headers,
  });
};

// Wrap the handler with the protection middleware.
export const GET = withX402Protection(accessHandler);