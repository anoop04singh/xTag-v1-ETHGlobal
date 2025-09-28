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

function parseArguments(argString: string): Record<string, string> {
  const args: Record<string, string> = {};
  const regex = /--(\w+)\s+([^\s]+|"[^"]+")/g;
  let match;
  while ((match = regex.exec(argString)) !== null) {
    const key = match[1];
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    args[key] = value;
  }
  return args;
}

async function getAIContext(): Promise<string> {
    return `You are an AI assistant with access to paid API endpoints.
Your primary goal is to help users by identifying when their request can be fulfilled by one of these endpoints.

Here are the available commands, their descriptions, and their costs:
- "get-data": Fetches a sample dataset. Cost: 0.01 USDC.
- "nft-metadata": Retrieves detailed metadata for a specific NFT. Requires a contract address and a token ID. Cost: 0.002 USDC.
- "trading-signals": Provides the latest cryptocurrency trading signals. Cost: 0.10 USDC.
- "documentation": Accesses technical documentation and guides. Cost: 0.02 USDC.
- "wallet-balance": Fetches the ERC20 token portfolio for any wallet address on the Polygon network. Requires an address. Cost: 0.002 USDC.

INTERACTION FLOW:
1.  When a user's query matches a command's functionality, you MUST ask for their permission and any required information.
2.  Your response must be a clear question that INCLUDES THE COST.
3.  At the end of your response, you MUST include a special action token in the format [DYAD_ACTION:run "command-name" --arg1 value1 --arg2 value2].

EXAMPLES:
- User: "show me the latest crypto trading signals"
  Your response: "I can fetch the latest cryptocurrency trading signals for you. This action costs 0.10 USDC. Would you like me to proceed? [DYAD_ACTION:run "trading-signals"]"

- User: "can you get me info on an NFT?"
  Your response: "Yes, I can fetch NFT metadata for you. This costs 0.002 USDC. What is the contract address and token ID of the NFT?"

- User: "the contract is 0x123... and the token is 456"
  Your response: "Great. I will now fetch the metadata for that NFT. Please confirm. [DYAD_ACTION:run "nft-metadata" --contract_address 0x123... --token_id 456]"

- User: "what's in my wallet?" or "show my portfolio"
  Your response: "I can fetch the ERC20 token portfolio for your connected wallet. This action costs 0.002 USDC. Would you like me to proceed? [DYAD_ACTION:run "wallet-balance"]"

- User: "check the balance of 0xabc..."
  Your response: "I can fetch the token portfolio for wallet 0xabc.... This action costs 0.002 USDC. Would you like me to proceed? [DYAD_ACTION:run "wallet-balance" --address 0xabc...]"

IMPORTANT:
- Always state the cost when asking for permission.
- If a command needs parameters (like nft-metadata or wallet-balance), ask for them first before providing the action token.
- If a user asks for their own balance, you can omit the --address flag, and the system will use their connected wallet.
- Only suggest one command at a time.
- If the user explicitly types the full 'run' command, the system will handle it directly.`;
}

function formatApiResponse(command: string, data: any, address?: string): string {
    if (command === 'nft-metadata' && data.metadata && data.metadata.data && Array.isArray(data.metadata.data)) {
        const nfts = new Map();
        data.metadata.data.forEach((item: any) => {
            const key = `${item.contract_address}-${item.token_id}`;
            if (!nfts.has(key)) {
                nfts.set(key, { ...item, marketplaces: [] });
            }
            if (item.marketplace) {
                nfts.get(key).marketplaces.push(item.marketplace);
            }
        });
        const processedNfts = Array.from(nfts.values());
        const count = processedNfts.length;

        return `✅ I found details for ${count} NFT(s). You can view them now. [DYAD_NFT_DATA:${JSON.stringify(processedNfts)}]`;
    }

    let formattedContent = `✅ **Successfully fetched data from "${command}"**\n\n`;

    switch (command) {
        case 'get-data':
            formattedContent += `Here is the sample data you requested:\n- **Message:** ${data.message}\n- **Timestamp:** ${new Date(data.timestamp).toLocaleString()}`;
            break;
        case 'trading-signals':
            formattedContent += `**Latest Trading Signals:**\n`;
            data.signals.forEach((signal: any) => {
                const emoji = signal.signal === 'BUY' ? '🟢' : signal.signal === 'SELL' ? '🔴' : '⚪️';
                formattedContent += `- ${emoji} **${signal.pair}**: ${signal.signal} at ${signal.price} (Confidence: ${signal.confidence})\n`;
            });
            break;
        case 'documentation':
            if (data.topic && data.version && data.content) {
                formattedContent += `**Documentation Found:**\n- **Topic:** ${data.topic}\n- **Version:** ${data.version}\n\n---\n\n${data.content}`;
            } else {
                formattedContent += `**Documentation Content:**\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            }
            break;
        case 'wallet-balance':
            formattedContent += `**Token Portfolio for wallet \`${address}\` on Polygon:**\n`;
            if (data.balances && data.balances.data && Array.isArray(data.balances.data) && data.balances.data.length > 0) {
                data.balances.data.forEach((token: any) => {
                    const balanceValue = token.quantity / Math.pow(10, token.decimal);
                    const balance = balanceValue.toFixed(4);
                    const value = token.value_in_usd ? `$${parseFloat(token.value_in_usd).toFixed(2)}` : 'N/A';
                    const name = token.token_name;
                    const symbol = token.token_symbol;
                    formattedContent += `- **${name} (${symbol})**: ${balance} (Value: ${value})\n`;
                });
            } else {
                formattedContent += `It looks like this wallet doesn't have any ERC20 tokens, or they couldn't be fetched at this time.`;
            }
            break;
        default:
            formattedContent += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
            break;
    }
    return formattedContent;
}

async function handlePaidRequest(userId: string, command: string, args: Record<string, string>) {
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
    
    const targetAddress = args.address || user.walletAddress;
    const params = command === 'wallet-balance' 
        ? { address: targetAddress } 
        : command === 'nft-metadata' 
        ? { contract_address: args.contract_address, token_id: args.token_id } 
        : {};

    for (let i = 0; i <= retries; i++) {
        try {
            console.log(`[CHAT API] Making paid request to ${path} with params:`, params);
            const response = await api.get(path, { params });
            
            console.log('[CHAT API] Raw data received from endpoint:', JSON.stringify(response.data, null, 2));

            const paymentResponse = response.headers['x-payment-response'] 
                ? decodeXPaymentResponse(response.headers['x-payment-response'])
                : null;

            let content = formatApiResponse(command, response.data, targetAddress);

            if (paymentResponse) {
                content += `\n\n---\n**Payment Details:**\n*Transaction Hash:* \`${paymentResponse.transaction}\``;
            } else if (command !== 'nft-metadata') {
                content += `\n\n*(Access was granted without a new payment, you may already have access).*`;
            }
            return content;

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

    const commandRegex = /^run "([^"]+)"(.*)$/;
    const commandMatch = message.trim().match(commandRegex);
    const validCommands = ["get-data", "nft-metadata", "trading-signals", "documentation", "wallet-balance"];

    if (commandMatch && validCommands.includes(commandMatch[1])) {
        const command = commandMatch[1];
        const argString = commandMatch[2].trim();
        const args = parseArguments(argString);

        if (command === 'nft-metadata' && (!args.contract_address || !args.token_id)) {
            return NextResponse.json({ role: 'assistant', content: 'Error: The "nft-metadata" command requires both --contract_address and --token_id arguments.' });
        }

        try {
            responseContent = await handlePaidRequest(user.id, command, args);
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