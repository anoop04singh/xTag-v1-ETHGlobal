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
    
    // If no mapping exists, it's a new user. Create wallet, save mapping, then create user.
    console.log('[NFC AUTH API] No mapping found. Starting new user signup process...');
    const { signerPrivateKey, walletAddress } = await createWallet();
    
    console.log(`[NFC AUTH API] Saving new NFC ID and private key to the mapping table...`);
    await prisma.nfcTestMapping.create({
      data: {
        nfcId,
        privateKey: signerPrivateKey,
      },
    });

    console.log(`[NFC AUTH API] Encrypting private key for user record...`);
    const encryptedSignerKey = encrypt(signerPrivateKey);

    console.log(`[NFC AUTH API] Creating new user record in database...`);
    const user = await prisma.user.create({
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
      message: 'Signup successful, wallet and mapping created',
      token,
      walletAddress,
      isNewUser: true,
    }, { status: 201 });

  } catch (error) {
    console.error('[NFC AUTH API] CRITICAL ERROR:', error);
    // Handle potential unique constraint violation if two requests come at once
    if (error.code === 'P2002' && error.meta?.target?.includes('nfcId')) {
        return NextResponse.json({ error: 'This NFC ID was just registered. Please try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}