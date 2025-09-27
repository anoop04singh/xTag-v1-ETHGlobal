import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';
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
    console.log(`[CHAT API] handlePaidRequest for user: ${userId}`);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new Error('User not found for paid request.');
    }

    const privateKey = decrypt(user.encryptedSignerKey) as Hex;
    const account = privateKeyToAccount(privateKey);
    console.log(`[CHAT API] Initialized account for wallet: ${account.address}`);

    const api = withPaymentInterceptor(axios.create({ baseURL: PAID_RESOURCE_BASE_URL }), account);

    try {
        console.log(`[CHAT API] Making paid request to ${PAID_RESOURCE_BASE_URL}${PAID_RESOURCE_PATH}`);
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
  console.log("\n--- [CHAT API] New Request ---");
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    // --- Command Handling ---
    if (message.trim().toLowerCase() === 'run "get-data"') {
        console.log(`[CHAT API] Detected 'run "get-data"' command.`);
        
        let conversation;
        let isNewConversation = false;
        if (conversationId && !conversationId.startsWith('temp-')) {
            conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
        } else {
            isNewConversation = true;
            const title = await getTitleForConversation(message);
            conversation = await prisma.conversation.create({ data: { title, userId: user.id } });
        }

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found or could not be created' }, { status: 404 });
        }

        await prisma.message.create({ data: { role: 'user', content: message, conversationId: conversation.id } });

        try {
            const paidContent = await handlePaidRequest(user.id);
            const assistantMessage = await prisma.message.create({
                data: { role: 'assistant', content: paidContent, conversationId: conversation.id },
            });
            return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: assistantMessage });
        } catch (error: any) {
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: `Error: ${error.message}`, conversationId: conversation.id },
            });
            return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: failureMessage });
        }
    }

    // --- Standard Chat Flow ---
    let conversation;
    let isNewConversation = false;

    if (conversationId && !conversationId.startsWith('temp-')) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    } else {
      isNewConversation = true;
      const title = await getTitleForConversation(message);
      conversation = await prisma.conversation.create({ data: { title, userId: user.id }, include: { messages: true } });
    }

    await prisma.message.create({ data: { role: 'user', content: message, conversationId: conversation.id } });
    
    const updatedConversation = await prisma.conversation.findFirst({ where: { id: conversation.id }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!updatedConversation) return NextResponse.json({ error: 'Could not retrieve conversation' }, { status: 500 });

    const history = updatedConversation.messages.slice(0, -1).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
    const systemInstruction = await getAIContext();
    const aiResponseContent = await getChatResponse(history, message, systemInstruction);

    const assistantMessage = await prisma.message.create({ data: { role: 'assistant', content: aiResponseContent, conversationId: conversation.id } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: assistantMessage });

  } catch (error) {
    console.error('[CHAT API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}