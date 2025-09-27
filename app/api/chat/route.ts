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
    return `You are an AI assistant with access to paid API endpoints.
Your primary goal is to help users by identifying when their request can be fulfilled by one of these endpoints.

Here are the available commands, their descriptions, and their costs:
- "get-data": Fetches a sample dataset. Cost: 0.01 USDC.
- "nft-metadata": Retrieves detailed metadata for a specific NFT. Cost: 0.05 USDC.
- "trading-signals": Provides the latest cryptocurrency trading signals. Cost: 0.10 USDC.
- "documentation": Accesses technical documentation and guides. Cost: 0.02 USDC.

INTERACTION FLOW:
1. When a user's query matches the functionality of a command, you MUST ask for their permission to run it.
2. Your response must be a clear question that INCLUDES THE COST. For example: "I can get the latest trading signals for you. This will cost 0.10 USDC. Shall I proceed?"
3. At the end of your response, you MUST include a special action token in the format [DYAD_ACTION:run "command-name"].

EXAMPLE:
User: "show me the latest crypto trading signals"
Your response: "I can fetch the latest cryptocurrency trading signals for you. This action costs 0.10 USDC. Would you like me to proceed? [DYAD_ACTION:run "trading-signals"]"

IMPORTANT:
- Always state the cost when asking for permission.
- Only suggest one command at a time.
- Do not execute the command yourself. The user will confirm via a button.
- If the user's query is general conversation, just chat with them normally without suggesting a command.
- If the user explicitly types 'run "command-name"', the system will handle it directly, so you don't need to respond to that.`;
}

function formatApiResponse(command: string, data: any): string {
    let formattedContent = `✅ **Successfully fetched data from "${command}"**\n\n`;

    switch (command) {
        case 'get-data':
            formattedContent += `Here is the sample data you requested:\n- **Message:** ${data.message}\n- **Timestamp:** ${new Date(data.timestamp).toLocaleString()}`;
            break;
        case 'nft-metadata':
            formattedContent += `**NFT Details:**\n- **Name:** ${data.name}\n- **Description:** ${data.description}\n- **Image:** [View Image](${data.image})\n`;
            if (data.attributes && data.attributes.length > 0) {
                formattedContent += `- **Attributes:**\n`;
                data.attributes.forEach((attr: any) => {
                    formattedContent += `  - *${attr.trait_type}:* ${attr.value}\n`;
                });
            }
            break;
        case 'trading-signals':
            formattedContent += `**Latest Trading Signals:**\n`;
            data.signals.forEach((signal: any) => {
                const emoji = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '⚪️';
                formattedContent += `- ${emoji} **${signal.pair}**: ${signal.signal} at ${signal.price} (Confidence: ${signal.confidence})\n`;
            });
            break;
        case 'documentation':
            // Check for expected fields to prevent 'undefined' output
            if (data.topic && data.version && data.content) {
                formattedContent += `**Documentation Found:**\n- **Topic:** ${data.topic}\n- **Version:** ${data.version}\n\n---\n\n${data.content}`;
            } else {
                // Fallback for unexpected structure
                formattedContent += `**Documentation Content:**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            }
            break;
        default:
            formattedContent += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            break;
    }
    return formattedContent;
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

            let content = formatApiResponse(command, response.data);

            if (paymentResponse) {
                content += `\n\n---\n**Payment Details:**\n*Transaction Hash:* \`${paymentResponse.transaction}\``;
            } else {
                content += `\n\n*(Access was granted without a new payment, you may already have access).*`;
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