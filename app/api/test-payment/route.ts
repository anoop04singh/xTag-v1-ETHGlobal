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

    let response;
    const retries = 2;
    const delay = 1000;

    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[TEST PAYMENT API] Making paid request, attempt ${i + 1}/${retries + 1}`);
        response = await api.get(PAID_RESOURCE_PATH);
        break; // Success, exit loop
      } catch (error: any) {
        console.error(`[TEST PAYMENT API] Attempt ${i + 1} failed:`, error.response?.data || error.message);
        if (i === retries) {
          throw error; // Last attempt, re-throw to be caught by outer catch block
        }
        await new Promise(res => setTimeout(res, delay * (i + 1))); // Wait with increasing delay
      }
    }

    if (!response) {
        throw new Error("Request failed after all retries but no response was received.");
    }
    
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
    
    let detailedError = "Paid request failed. This could be due to insufficient funds or a temporary network issue.";
    if (error.response?.data?.message) {
        detailedError = error.response.data.message;
    } else if (error.message) {
        if (error.message.includes('nonce')) {
            detailedError = "Transaction failed due to a nonce issue. Please try again.";
        } else if (error.message.includes('insufficient funds')) {
            detailedError = "Transaction failed: Insufficient funds for gas.";
        } else if (error.message.includes('timeout')) {
            detailedError = "The request timed out, possibly due to network congestion. Please try again.";
        }
    }

    return NextResponse.json(
        { error: 'Paid request failed', details: detailedError }, 
        { status: 500 }
    );
  }
}