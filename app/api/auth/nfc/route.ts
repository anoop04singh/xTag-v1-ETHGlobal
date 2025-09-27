import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createWallet } from '@/lib/wallet';
import { encrypt } from '@/lib/encryption';
import { createToken } from '@/lib/auth';
import { privateKeyToAccount } from 'viem/accounts';
import { Hex } from 'viem';

export async function POST(request: Request) {
  console.log("\n--- [NFC AUTH API] New Request ---");
  try {
    const { nfcId } = await request.json();
    console.log(`[NFC AUTH API] Attempting auth for NFC ID: ${nfcId}`);

    if (!nfcId) {
      console.log("[NFC AUTH API] Error: nfcId is required.");
      return NextResponse.json({ error: 'nfcId is required' }, { status: 400 });
    }

    // --- [NEW] Check for test mapping first ---
    const testMapping = await prisma.nfcTestMapping.findUnique({
      where: { nfcId },
    });

    if (testMapping) {
      console.log(`[NFC AUTH API] Found test mapping for NFC ID: ${nfcId}`);
      const privateKey = testMapping.privateKey as Hex;
      const account = privateKeyToAccount(privateKey);
      const walletAddress = account.address;

      let user = await prisma.user.findUnique({
        where: { walletAddress },
      });

      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        console.log(`[NFC AUTH API] No user for wallet ${walletAddress}. Creating new user from test mapping.`);
        const encryptedSignerKey = encrypt(privateKey);
        user = await prisma.user.create({
          data: {
            nfcId,
            walletAddress,
            encryptedSignerKey,
          },
        });
        console.log(`[NFC AUTH API] New user created from test mapping with ID: ${user.id}`);
      } else {
        console.log(`[NFC AUTH API] Found existing user ${user.id} for wallet ${walletAddress}.`);
      }
      
      const token = createToken({ id: user.id, walletAddress: user.walletAddress });
      console.log("[NFC AUTH API] Login successful via test mapping.");
      return NextResponse.json({ message: 'Login successful via test mapping', token, isNewUser });
    }
    
    // --- [FALLBACK] Original logic ---
    console.log(`[NFC AUTH API] No test mapping found. Proceeding with standard flow.`);
    let user = await prisma.user.findUnique({
      where: { nfcId },
    });

    if (user) {
      console.log(`[NFC AUTH API] Existing user found: ${user.id}. Generating login token.`);
      const token = createToken({ id: user.id, walletAddress: user.walletAddress });
      console.log("[NFC AUTH API] Login successful.");
      return NextResponse.json({ message: 'Login successful', token, isNewUser: false });
    }

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