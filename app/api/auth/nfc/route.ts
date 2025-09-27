import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createWallet } from '@/lib/wallet';
import { encrypt } from '@/lib/encryption';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  console.log("\n--- [NFC AUTH API] New Request ---");
  try {
    const { nfcId } = await request.json();
    console.log(`[NFC AUTH API] Attempting auth for NFC ID: ${nfcId}`);

    if (!nfcId) {
      console.log("[NFC AUTH API] Error: nfcId is required.");
      return NextResponse.json({ error: 'nfcId is required' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { nfcId },
    });

    // If user exists, it's a login
    if (user) {
      console.log(`[NFC AUTH API] Existing user found: ${user.id}. Generating login token.`);
      const token = createToken({ id: user.id, walletAddress: user.walletAddress });
      console.log("[NFC AUTH API] Login successful.");
      return NextResponse.json({ message: 'Login successful', token, isNewUser: false });
    }

    // If user does not exist, it's a signup
    console.log('[NFC AUTH API] New user detected. Starting signup process...');
    const { signerPrivateKey, walletAddress } = await createWallet();
    
    console.log(`[NFC AUTH API] Encrypting private key for storage...`);
    const encryptedSignerKey = encrypt(signerPrivateKey);

    console.log(`[NFC AUTH API] Creating new user record in database...`);
    user = await prisma.user.create({
      data: {
        nfcId,
        walletAddress,
        encryptedSignerKey,
      },
    });
    console.log(`[NFC AUTH API] New user created with ID: ${user.id}`);

    const token = createToken({ id: user.id, walletAddress: user.walletAddress });
    console.log("[NFC AUTH API] Signup successful, token generated.");

    return NextResponse.json({
      message: 'Signup successful, wallet created',
      token,
      walletAddress,
      isNewUser: true,
    }, { status: 201 });

  } catch (error) {
    console.error('[NFC AUTH API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}