import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { decrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  console.log("\n--- [PRIVATE KEY API] New Request ---");
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.encryptedSignerKey) {
      return NextResponse.json({ error: 'User or key not found' }, { status: 404 });
    }

    const privateKey = decrypt(dbUser.encryptedSignerKey);
    console.log(`[PRIVATE KEY API] Decrypted key for user ${user.id}`);

    return NextResponse.json({ privateKey });

  } catch (error) {
    console.error('[PRIVATE KEY API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}