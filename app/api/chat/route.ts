import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';

async function getSubscriptionContext(): Promise<string> {
    const allSubscriptions = await prisma.subscription.findMany();
    if (allSubscriptions.length === 0) {
        return "";
    }

    const subscriptionList = allSubscriptions.map(sub => 
        `- Name: ${sub.name}\n  Description: ${sub.description}\n  Prompt: ${sub.prompt}`
    ).join('\n\n');

    return `You are an AI assistant. You have knowledge of the following user-created subscriptions available on this platform. You can answer questions about them or use their prompts if a user asks to 'run' a subscription.\n\nAvailable Subscriptions:\n${subscriptionList}`;
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