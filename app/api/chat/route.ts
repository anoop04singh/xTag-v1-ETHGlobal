import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';
import { getChatResponse, getTitleForConversation } from '@/lib/gemini';

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
      // Create a new conversation
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

    // Save user message
    await prisma.message.create({
      data: {
        role: 'user',
        content: message,
        conversationId: conversation.id,
      },
    });
    
    // Refetch conversation with the new message to build history
    const updatedConversation = await prisma.conversation.findFirst({
        where: { id: conversation.id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    // Prepare history for LLM
    const history = updatedConversation.messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Get AI response
    const aiResponseContent = await getChatResponse(history, message);

    // Save AI response
    const assistantMessage = await prisma.message.create({
      data: {
        role: 'assistant',
        content: aiResponseContent,
        conversationId: conversation.id,
      },
    });

    // Update conversation's updatedAt timestamp
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