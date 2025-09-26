import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/currentUser';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Map to the format the frontend expects
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: conv.messages.length,
      preview: conv.messages[conv.messages.length - 1]?.content.slice(0, 80) || 'No messages yet.',
      pinned: false, // Pinned state will be managed on the client for now
      folder: null, // Folder state will be managed on the client for now
      messages: conv.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })),
    }));

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}