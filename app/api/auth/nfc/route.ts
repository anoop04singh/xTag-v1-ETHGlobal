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

    let testMapping = await prisma.nfcTestMapping.findUnique({
      where: { nfcId },
    });

    // If no mapping exists, it's a new user.
    if (!testMapping) {
      console.log('[NFC AUTH API] No mapping found. Starting new user signup process...');
      const { signerPrivateKey, walletAddress } = await createWallet();
      
      try {
        testMapping = await prisma.nfcTestMapping.create({
          data: { nfcId, privateKey: signerPrivateKey },
        });
        console.log(`[NFC AUTH API] New mapping created for NFC ID.`);

        const encryptedSignerKey = encrypt(signerPrivateKey);
        const user = await prisma.user.create({
          data: { nfcId, walletAddress, encryptedSignerKey },
        });
        console.log(`[NFC AUTH API] New user created with ID: ${user.id}`);

        const token = createToken({ id: user.id, walletAddress: user.walletAddress });
        return NextResponse.json({
          message: 'Signup successful, wallet and mapping created',
          token,
          isNewUser: true,
        }, { status: 201 });

      } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('nfcId')) {
          console.log("[NFC AUTH API] Race condition detected. Re-fetching mapping.");
          testMapping = await prisma.nfcTestMapping.findUnique({ where: { nfcId } });
          if (!testMapping) {
            throw new Error("Failed to create or find NFC mapping after race condition.");
          }
        } else {
          throw error;
        }
      }
    }

    // If we are here, a mapping exists. Proceed with login.
    console.log(`[NFC AUTH API] Found mapping for NFC ID. Proceeding with login.`);
    const privateKey = testMapping.privateKey as Hex;
    const account = privateKeyToAccount(privateKey);
    const walletAddress = account.address;

    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Recovery case: mapping exists, but user doesn't. Recreate user.
      console.log(`[NFC AUTH API] No user for wallet ${walletAddress}. Recreating user from mapping.`);
      const encryptedSignerKey = encrypt(privateKey);
      user = await prisma.user.create({
        data: { nfcId, walletAddress, encryptedSignerKey },
      });
      console.log(`[NFC AUTH API] User recreated with ID: ${user.id}`);
    } else {
      console.log(`[NFC AUTH API] Found existing user ${user.id} for wallet ${walletAddress}.`);
    }
    
    const token = createToken({ id: user.id, walletAddress: user.walletAddress });
    console.log("[NFC AUTH API] Login successful.");
    return NextResponse.json({ message: 'Login successful', token, isNewUser: false });

  } catch (error: any) {
    console.error('[NFC AUTH API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}