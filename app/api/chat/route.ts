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

        if (subscription) {
            try {
                // Attempt to access the resource. This will trigger the x402 flow if needed.
                const { data, txHash } = await makePaidRequest(user.id, `/api/subscriptions/${subscription.id}/access`, userToken);
                
                const purchase = await prisma.purchase.findUnique({ where: { userId_subscriptionId: { userId: user.id, subscriptionId: subscription.id } } });

                let wasNewPurchase = false;
                // The presence of a txHash confirms a new, successful on-chain transaction.
                if (!purchase && txHash) {
                    // Create a permanent record of the purchase with the on-chain transaction hash.
                    await prisma.purchase.create({
                        data: { userId: user.id, subscriptionId: subscription.id, txHash }
                    });
                    wasNewPurchase = true;
                }

                const premiumPrompt = data.prompt;
                const aiResponseContent = await getChatResponse([], premiumPrompt);

                let finalContent = aiResponseContent;
                if (wasNewPurchase) {
                    finalContent = `Payment of ${subscription.price.toString()} MATIC for "${subName}" was successful! Transaction confirmed on-chain. Here is the result:\n\n${aiResponseContent}`;
                }
                
                const assistantMessage = await prisma.message.create({
                    data: { role: 'assistant', content: finalContent, conversationId: conversationId },
                });
                return NextResponse.json({ message: assistantMessage });

            } catch (error: any) {
                console.error("Payment flow error:", error);
                const failureMessage = await prisma.message.create({
                    data: { role: 'assistant', content: `I'm sorry, the payment failed: ${error.message}`, conversationId: conversationId },
                });
                return NextResponse.json({ message: failureMessage });
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