import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';
import { executePayment } from '@/lib/payment';

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
  console.log("\n--- [CHAT API] New Request ---");
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      console.log("[CHAT API] Unauthorized: No user found for token.");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[CHAT API] Authenticated user: ${user.id}`);

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
        console.log(`[CHAT API] Detected 'run' command for subscription: "${subName}"`);

        const subscription = await prisma.subscription.findFirst({ where: { name: { equals: subName, mode: 'insensitive' } } });
        if (!subscription) {
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: `I could not find a subscription named "${subName}".`, conversationId },
            });
            return NextResponse.json({ message: failureMessage });
        }

        const accessUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/${subscription.id}/access`;
        let premiumPrompt: string | undefined;
        let wasNewPurchase = false;

        // Step 1: Initial request to check access
        let accessResponse = await fetch(accessUrl, { headers: { 'Authorization': `Bearer ${userToken}` } });

        // Step 2: If 402, handle payment
        if (accessResponse.status === 402) {
            console.log("[CHAT API] Received 402. Starting payment process.");
            const paymentChallenge = await accessResponse.json();
            const paymentDetails = paymentChallenge.accepts[0];

            try {
                const { success, txHash } = await executePayment(user.id, paymentDetails);
                if (success && txHash) {
                    console.log(`[CHAT API] On-chain payment successful. TxHash: ${txHash}`);
                    
                    // Step 3: Retry request with payment proof
                    const paymentPayload = { txHash, chainId: polygonAmoy.id.toString() };
                    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
                    
                    console.log("[CHAT API] Retrying request with X-PAYMENT header.");
                    accessResponse = await fetch(accessUrl, {
                        headers: {
                            'Authorization': `Bearer ${userToken}`,
                            'X-PAYMENT': paymentHeader,
                        },
                    });

                    if (accessResponse.ok) {
                        await prisma.purchase.create({ data: { userId: user.id, subscriptionId: subscription.id, txHash } });
                        wasNewPurchase = true;
                    }
                } else {
                    throw new Error("Payment execution did not return a success status or txHash.");
                }
            } catch (error: any) {
                console.error("[CHAT API] ERROR during payment execution:", error.message);
                const failureMessage = await prisma.message.create({
                    data: { role: 'assistant', content: `I'm sorry, the transaction failed: ${error.message}`, conversationId },
                });
                return NextResponse.json({ message: failureMessage });
            }
        }

        // Step 4: Process final response
        if (accessResponse.ok) {
            const data = await accessResponse.json();
            premiumPrompt = data.prompt;
        } else {
            const errorText = await accessResponse.text();
            console.error(`[CHAT API] Final access request failed with status ${accessResponse.status}: ${errorText}`);
            const failureMessage = await prisma.message.create({
                data: { role: 'assistant', content: "I'm sorry, I couldn't access the premium content even after the payment process.", conversationId },
            });
            return NextResponse.json({ message: failureMessage });
        }

        // Generate and send final message
        const aiResponseContent = await getChatResponse([], premiumPrompt!);
        let finalContent = aiResponseContent;
        if (wasNewPurchase) {
            finalContent = `Payment of ${subscription.price.toString()} ${subscription.currency} for "${subName}" was successful! Here is your premium content:\n\n${aiResponseContent}`;
        }
        const assistantMessage = await prisma.message.create({
            data: { role: 'assistant', content: finalContent, conversationId },
        });
        return NextResponse.json({ message: assistantMessage });
    }

    // --- Standard Chat Flow ---
    let conversation;
    let isNewConversation = false;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId: user.id } });
    }
    if (!conversation) {
      isNewConversation = true;
      const title = await getTitleForConversation(message);
      conversation = await prisma.conversation.create({ data: { title, userId: user.id } });
    }
    await prisma.message.create({ data: { role: 'user', content: message, conversationId: conversation.id } });
    const history = (await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' } })).slice(0, -1).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));
    const systemInstruction = await getSubscriptionContext();
    const aiResponseContent = await getChatResponse(history, message, systemInstruction);
    const assistantMessage = await prisma.message.create({ data: { role: 'assistant', content: aiResponseContent, conversationId: conversation.id } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return NextResponse.json({ isNewConversation, conversationId: conversation.id, title: conversation.title, message: assistantMessage });

  } catch (error) {
    console.error('[CHAT API] CRITICAL ERROR:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}