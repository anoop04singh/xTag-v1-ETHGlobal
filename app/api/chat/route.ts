import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';

async function getSubscriptionContext(): Promise<string> {
    const allSubscriptions = await prisma.subscription.findMany();
    if (allSubscriptions.length === 0) {
        return "You are a helpful AI assistant.";
    }

    const subscriptionList = allSubscriptions.map(sub => 
        `---
Subscription Name: "${sub.name}"
Description: ${sub.description}
Agent Prompt to use if user runs this subscription: "${sub.prompt}"
---`
    ).join('\n\n');

    return `You are an AI assistant.
Below is a list of available, user-created "subscriptions". Each subscription has a name, a description, and a specific "Agent Prompt".

Your primary task is to be a general conversational AI. However, if a user's message explicitly asks to "run", "list", "execute", or inquire about subscriptions, you MUST use the information below.

- If asked to list subscriptions, list them by name and description.
- If asked to "run" a specific subscription by its name, you MUST use its corresponding "Agent Prompt" to generate the entire response.
- Otherwise, for all other general conversation, IGNORE this subscription list completely.

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

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let conversation;
    let isNewConversation = false;

    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
    } else {
      isNewConversation = true;
      const title = await getTitleForConversation(message);
      conversation = await prisma.conversation.create({
        data: {
          title,
          userId: user.id,
        },
        include: { messages: true },
      });
    }

    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id,
      },
    });
    
    const updatedConversation = await prisma.conversation.findFirst({
        where: { id: conversation.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!updatedConversation) {
      return NextResponse.json({ error: 'Could not retrieve conversation' }, { status: 500 });
    }

    const history = updatedConversation.messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const systemInstruction = await getSubscriptionContext();
    const aiResponseContent = await getChatResponse(history, message, systemInstruction);

    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponseContent,
        conversationId: conversation.id,
      },
    });

    await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() }
    });

    return NextResponse.json({
      isNewConversation,
      conversationId: conversation.id,
      title: conversation.title,
      message: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}