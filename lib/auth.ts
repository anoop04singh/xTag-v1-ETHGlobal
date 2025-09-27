import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error('JWT_SECRET is not set in .env file');
}

interface UserPayload {
  id: string;
  walletAddress: string;
}

export function createToken(user: UserPayload): string {
  return jwt.sign(user, secret, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, secret) as UserPayload;
  } catch (error) {
    return null;
  }
}