import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mapping = await prisma.nfcTestMapping.findUnique({
      where: { nfcId: user.nfcId },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Private key mapping not found for this user.' }, { status: 404 });
    }

    return NextResponse.json({ privateKey: mapping.privateKey });

  } catch (error) {
    console.error('Error fetching private key:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}