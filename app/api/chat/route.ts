import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse } from '@/lib/gemini';
import { decrypt } from '@/lib/encryption';
import axios from 'axios';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor, decodeXPaymentResponse } from 'x402-axios';

const PAID_RESOURCE_BASE_URL = 'http://localhost:4020';
const PAID_RESOURCE_PATH = '/get-data';

async function getAIContext(): Promise<string> {
    return `You are an AI assistant. You have access to one special command that provides data.
- To use the command, the user must type: run "get-data"
- If the user asks what you can do, or how to get data, you MUST inform them to use the command: run "get-data".
- Do not make up other commands. This is the only one.`;
}

async function handlePaidRequest(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error('User not found for paid request.');
    }

    const privateKey = decrypt(user.encryptedSignerKey) as Hex;
    const account = privateKeyToAccount(privateKey);
    const api = withPaymentInterceptor(axios.create({ baseURL: PAID_RESOURCE_BASE_URL }), account);

    try {
        const response = await api.get(PAID_RESOURCE_PATH);
        const paymentResponse = response.headers['x-payment-response'] 
            ? decodeXPaymentResponse(response.headers['x-payment-response'])
            : null;

        let content = `Successfully fetched data: ${JSON.stringify(response.data)}`;
        if (paymentResponse) {
            content += `\n\nPayment Details:\nTransaction Hash: ${paymentResponse.txHash}`;
        } else {
            content += `\n\n(Access was granted without a new payment, you may already have access).`;
        }
        return content;

    } catch (error: any) {
        console.error("[CHAT API] Paid request failed:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || "The paid request failed. You may not have enough funds.");
    }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    let responseContent: string;

    if (message.trim().toLowerCase() === 'run "get-data"') {
        try {
            responseContent = await handlePaidRequest(user.id);
        } catch (error: any) {
            responseContent = `Error: ${error.message}`;
        }
    } else {
        const systemInstruction = await getAIContext();
        responseContent = await getChatResponse([], message, systemInstruction);
    }

    return NextResponse.json({ role: 'assistant', content: responseContent });

  } catch (error) {
    console.error('[CHAT API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}