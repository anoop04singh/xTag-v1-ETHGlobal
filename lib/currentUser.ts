import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface UserPayload {
  id: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

export const getCurrentUser = async (request: NextRequest): Promise<{ id: string; walletAddress: string } | null> => {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set.');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    
    return { id: decoded.id, walletAddress: decoded.walletAddress };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};