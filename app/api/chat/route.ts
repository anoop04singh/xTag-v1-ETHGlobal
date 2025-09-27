import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';
import { makePaidRequest } from '@/lib/x402';

async function getSubscriptionContext(userId: string): Promise<string> {
    const allSubscriptions = await prisma.subscription.findMany({
        include: { creator: true }
    });
    const userPurchases = await prisma.purchase.findMany({
        where: { userId },
        select: { subscriptionId: true }
    });
    const purchasedIds = new Set(userPurchases.map(p => p.subscriptionId));

    if (allSubscriptions.length === 0) {
        return "You are a helpful AI assistant.";
    }

    const subscriptionList = allSubscriptions.map(sub => {
        const isOwned = purchasedIds.has(sub.id) || sub.creatorId === userId;
        const status = isOwned ? "OWNED" : `NOT OWNED, Price: ${sub.price} ${sub.currency}`;
        return `---
Subscription Name: "${sub.name}"
Description: ${sub.description}
Status: ${status}
---`;
    }).join('\n\n');

    return `You are an AI assistant. Users can interact with you conversationally. You also have access to special paid "subscriptions" which can be executed using the command: run "subscription name". You should not try to run them yourself, just inform the user about the command if they ask about subscriptions. Here is a list of available subscriptions for your reference:
${subscriptionList}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeader = request.headers.get('Authorization');
    const userToken = authHeader?.split(' ')[1];
    if (!userToken) {
        return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const { conversationId, message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const runMatch = message.match(/run\s+"([^"]+)"/i);
    if (runMatch) {
        const subName = runMatch[1];
        const subscription = await prisma.subscription.findFirst({ where: { name: { equals: subName, mode: 'insensitive' } } });

        if (!subscription) {
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: `I could not find a subscription named "${subName}".`, conversationId: conversationId },
            });
            return NextResponse.json({ message: failureMessage });
        }

        const purchase = await prisma.purchase.findUnique({ where: { userId_subscriptionId: { userId: user.id, subscriptionId: subscription.id } } });
        const isCreator = user.id === subscription.creatorId;

        let premiumPrompt: string;
        let wasNewPurchase = false;

        if (purchase || isCreator) {
            premiumPrompt = subscription.prompt;
        } else {
            try {
                const { data, txHash } = await makePaidRequest(user.id, `/api/subscriptions/${subscription.id}/access`, userToken);
                
                if (txHash) {
                    await prisma.purchase.create({
                        data: { userId: user.id, subscriptionId: subscription.id, txHash }
                    });
                    wasNewPurchase = true;
                    premiumPrompt = data.prompt;
                } else {
                    throw new Error("Payment transaction hash was not received.");
                }
            } catch (error: any) {
                console.error("Payment flow error:", error);
                const failureMessage = await prisma.message.create({
                    data: { role: 'assistant', content: `I'm sorry, the payment failed: ${error.message}`, conversationId: conversationId },
                });
                return NextResponse.json({ message: failureMessage });
            }
        }
        
        const aiResponseContent = await getChatResponse([], premiumPrompt);
        let finalContent = aiResponseContent;
        if (wasNewPurchase) {
            finalContent = `Payment of ${subscription.price.toString()} ${subscription.currency} for "${subName}" was successful! Here is the result:\n\n${aiResponseContent}`;
        }
        
        const assistantMessage = await prisma.message.create({
            data: { role: 'assistant', content: finalContent, conversationId: conversationId },
        });
        return NextResponse.json({ message: assistantMessage });
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
    const systemInstruction = await getSubscriptionContext(user.id);
    const aiResponseContent = await getChatResponse(history, message, systemInstruction);

    const assistantMessage = await prisma.message.create({ data: { role: 'assistant', content: aiResponseContent, conversationId: conversation.id } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

    return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: assistantMessage });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}