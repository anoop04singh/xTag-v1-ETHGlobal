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

    return `You are an AI assistant with the ability to run paid "subscriptions".

Your primary task is to be a general conversational AI. However, you have access to a list of subscriptions below.

- If a user asks to "run" a subscription they OWN, you MUST use its corresponding premium prompt to generate the response.
- If a user asks to "run" a subscription they DO NOT OWN, you MUST inform them of the price and ask for confirmation to proceed with the payment. For example: "This subscription costs [price] [currency]. Would you like to proceed with the purchase?"
- If they confirm, you will automatically handle the payment.
- For all other general conversation, IGNORE this subscription list completely.

Available Subscriptions:
${subscriptionList}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message } = await request.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    // Check if the user is trying to run a subscription
    const runMatch = message.match(/run\s+"([^"]+)"/i);
    if (runMatch) {
        const subName = runMatch[1];
        const subscription = await prisma.subscription.findFirst({ where: { name: { equals: subName, mode: 'insensitive' } } });

        if (subscription) {
            const purchase = await prisma.purchase.findUnique({ where: { userId_subscriptionId: { userId: user.id, subscriptionId: subscription.id } } });

            if (!purchase && user.id !== subscription.creatorId) {
                // User doesn't own it, initiate payment
                try {
                    const data = await makePaidRequest(user.id, `/api/subscriptions/${subscription.id}/access`);
                    
                    // Payment successful, create purchase record
                    await prisma.purchase.create({
                        data: {
                            userId: user.id,
                            subscriptionId: subscription.id,
                            // txHash can be added here if returned from makePaidRequest
                        }
                    });

                    // Now use the premium prompt
                    const premiumPrompt = data.prompt;
                    const aiResponseContent = await getChatResponse([], premiumPrompt); // Fresh context for premium prompt
                    
                    const assistantMessage = await prisma.message.create({
                        data: { role: 'assistant', content: `Payment successful! Here is the result from the "${subName}" subscription:\n\n${aiResponseContent}`, conversationId: conversationId },
                    });
                    return NextResponse.json({ message: assistantMessage });

                } catch (error: any) {
                    return NextResponse.json({ error: `Payment failed: ${error.message}` }, { status: 500 });
                }
            }
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