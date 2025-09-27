import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse } from '@/lib/gemini';
import { decrypt } from '@/lib/encryption';
import axios from 'axios';
import { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { withPaymentInterceptor, decodeXPaymentResponse } from 'x402-axios';

const PAID_RESOURCE_BASE_URL = 'https://x402-server-updated.vercel.app';

async function getAIContext(): Promise<string> {
    return `You are an AI assistant. You have access to special commands that provide data.
- To use a command, the user must type: run "command-name"
- Available commands: "get-data", "nft-metadata", "trading-signals", "documentation".
- If the user asks what you can do, or how to get data, you MUST inform them about these commands.
- Do not make up other commands. These are the only ones.`;
}

async function handlePaidRequest(userId: string, command: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error('User not found for paid request.');
    }

    const privateKey = decrypt(user.encryptedSignerKey) as Hex;
    const account = privateKeyToAccount(privateKey);
    const api = withPaymentInterceptor(axios.create({ baseURL: PAID_RESOURCE_BASE_URL }), account);

    const retries = 2;
    const delay = 1000;
    const path = `/api/${command}`;

    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`[CHAT API] Making paid request to ${path}, attempt ${i + 1}/${retries + 1}`);
            const response = await api.get(path);
            
            const paymentResponse = response.headers['x-payment-response'] 
                ? decodeXPaymentResponse(response.headers['x-payment-response'])
                : null;

            let content = `Successfully fetched data from "${command}":\n\n\`\`\`json\n${JSON.stringify(response.data, null, 2)}\n\`\`\``;
            if (paymentResponse) {
                content += `\n\n**Payment Details:**\nTransaction Hash: \`${paymentResponse.transaction}\``;
            } else {
                content += `\n\n(Access was granted without a new payment, you may already have access).`;
            }
            return content; // Success

        } catch (error: any) {
            console.error(`[CHAT API] Attempt ${i + 1} failed:`, error.response?.data || error.message);
            if (i === retries) {
                let detailedError = "The paid request failed. This could be due to insufficient funds or a temporary network issue.";
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
                throw new Error(detailedError);
            }
            await new Promise(res => setTimeout(res, delay * (i + 1)));
        }
    }
    throw new Error("An unexpected error occurred after all retry attempts.");
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

    const commandMatch = message.trim().toLowerCase().match(/^run "([^"]+)"$/);
    const validCommands = ["get-data", "nft-metadata", "trading-signals", "documentation"];

    if (commandMatch && validCommands.includes(commandMatch[1])) {
        const command = commandMatch[1];
        try {
            responseContent = await handlePaidRequest(user.id, command);
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