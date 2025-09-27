import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { decrypt } from '@/lib/encryption';
import axios from 'axios';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor, decodeXPaymentResponse } from 'x402-axios';

const PAID_RESOURCE_BASE_URL = 'http://localhost:4020';
const PAID_RESOURCE_PATH = '/get-data';

export async function POST(request: NextRequest) {
  console.log("\n--- [TEST PAYMENT API] New Request ---");
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.log("[TEST PAYMENT API] Error: Unauthorized");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[TEST PAYMENT API] User found: ${user.id}`);
    const privateKey = decrypt(user.encryptedSignerKey) as Hex;
    const account = privateKeyToAccount(privateKey);
    console.log(`[TEST PAYMENT API] Initialized account for wallet: ${account.address}`);

    const api = withPaymentInterceptor(axios.create({ baseURL: PAID_RESOURCE_BASE_URL }), account);

    console.log(`[TEST PAYMENT API] Making paid request to ${PAID_RESOURCE_BASE_URL}${PAID_RESOURCE_PATH}`);
    const response = await api.get(PAID_RESOURCE_PATH);
    
    const paymentResponse = response.headers['x-payment-response'] 
        ? decodeXPaymentResponse(response.headers['x-payment-response'])
        : null;

    console.log("[TEST PAYMENT API] Request successful.");
    return NextResponse.json({
        data: response.data,
        paymentInfo: paymentResponse
    });

  } catch (error: any) {
    console.error("[TEST PAYMENT API] Paid request failed:", error.response?.data || error.message);
    return NextResponse.json(
        { error: 'Paid request failed', details: error.response?.data || error.message }, 
        { status: 500 }
    );
  }
}