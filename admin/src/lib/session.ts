import { config } from '@/config/env';
import { SessionOptions } from 'iron-session';

export interface SessionData {
  access_token?: string;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string;
  };
  isLoggedIn: boolean;
}

export const defaultSession: SessionData = {
  isLoggedIn: false
};

export const sessionOptions: SessionOptions = {
  password: config.SESSION_SECRET || '',
  cookieName: 'glucoheart-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
    path: '/'
  }
};
