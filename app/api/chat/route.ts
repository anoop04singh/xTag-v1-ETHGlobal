import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';
import { makePaidRequest } from '@/lib/x402';

async function getSubscriptionContext(): Promise<string> {
    const allSubscriptions = await prisma.subscription.findMany({
        select: { name: true, description: true }
    });

    if (allSubscriptions.length === 0) {
        return "You are a helpful AI assistant.";
    }

    const subscriptionList = allSubscriptions.map(sub => {
        return `---
Subscription Name: "${sub.name}"
Description: ${sub.description}
---`;
    }).join('\n\n');

    return `You are an AI assistant. You have access to special "subscriptions" that provide premium content or actions.

Your primary role is to be a helpful conversational AI.

Regarding subscriptions:
- If a user asks about a subscription or how to use it, you MUST inform them to use the command: run "subscription name".
- You do not have information about prices or whether the user owns a subscription. Do not guess. The system handles all payments automatically when the user runs the command.
- For example, if they ask "How do I get the tech news?", you should reply: "You can get the tech news by running the command: run "Daily Tech News"".

This is a list of available subscriptions for your reference:
${subscriptionList}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const authHeader = request.headers.get('Authorization');
    const userToken = authHeader?.split(' ')[1];
    if (!userToken) return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });

    const { conversationId, message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    // --- Command Handling ---
    const runMatch = message.match(/run\s+"([^"]+)"/i);
    if (runMatch) {
        const subName = runMatch[1];
        const subscription = await prisma.subscription.findFirst({ where: { name: { equals: subName, mode: 'insensitive' } } });

        if (!subscription) {
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: `I could not find a subscription named "${subName}". Please check the name and try again.`, conversationId: conversationId },
            });
            return NextResponse.json({ message: failureMessage });
        }

        try {
            const { data, txHash } = await makePaidRequest(user.id, `/api/subscriptions/${subscription.id}/access`, userToken);
            
            const purchase = await prisma.purchase.findUnique({ where: { userId_subscriptionId: { userId: user.id, subscriptionId: subscription.id } } });
            let wasNewPurchase = false;
            if (!purchase && txHash) {
                await prisma.purchase.create({ data: { userId: user.id, subscriptionId: subscription.id, txHash } });
                wasNewPurchase = true;
            }

            const premiumPrompt = data.prompt;
            const aiResponseContent = await getChatResponse([], premiumPrompt);

            let finalContent = aiResponseContent;
            if (wasNewPurchase) {
                finalContent = `Payment of ${subscription.price.toString()} ${subscription.currency} for "${subName}" was successful! Here is your premium content:\n\n${aiResponseContent}`;
            }
            
            const assistantMessage = await prisma.message.create({
                data: { role: 'assistant', content: finalContent, conversationId: conversationId },
            });
            return NextResponse.json({ message: assistantMessage });

        } catch (error: any) {
            console.error("Payment flow error:", error);
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: `I'm sorry, the transaction failed: ${error.message}`, conversationId: conversationId },
            });
            return NextResponse.json({ message: failureMessage });
        }
    }

    // --- Standard Chat Flow ---
    let conversation;
    let isNewConversation = false;

    if (conversationId) {
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
    const systemInstruction = await getSubscriptionContext();
    const aiResponseContent = await getChatResponse(history, message, systemInstruction);

    const assistantMessage = await prisma.message.create({ data: { role: 'assistant', content: aiResponseContent, conversationId: conversation.id } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: assistantMessage });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}