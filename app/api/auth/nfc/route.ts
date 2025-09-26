import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSmartAccount } from '@/lib/wallet';
import { encrypt } from '@/lib/encryption';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { nfcId } = await request.json();

    if (!nfcId) {
      return NextResponse.json({ error: 'nfcId is required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { nfcId },
    });

    // If user exists, it's a login
    if (user) {
      const token = createToken({ id: user.id, smartAccountAddress: user.smartAccountAddress });
      return NextResponse.json({ message: 'Login successful', token, isNewUser: false });
    }

    // If user does not exist, it's a signup
    console.log('New user detected. Creating smart account...');
    const { signerPrivateKey, smartAccountAddress } = await createSmartAccount();
    console.log(`Smart account created: ${smartAccountAddress}`);

    const encryptedSignerKey = encrypt(signerPrivateKey);

    user = await prisma.user.create({
      data: {
        nfcId,
        smartAccountAddress,
        encryptedSignerKey,
      },
    });

    const token = createToken({ id: user.id, smartAccountAddress: user.smartAccountAddress });

    return NextResponse.json({
      message: 'Signup successful, smart account created',
      token,
      smartAccountAddress,
      isNewUser: true,
    }, { status: 201 });

  } catch (error) {
    console.error('NFC Auth Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}