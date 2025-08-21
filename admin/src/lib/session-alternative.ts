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

// Alternative permissive configuration for VPS testing
export const permissiveSessionOptions: SessionOptions = {
  password: config.SESSION_SECRET || '',
  cookieName: 'glucoheart-session',
  cookieOptions: {
    secure: false, // Disable secure untuk HTTP
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax', // Lebih permissive
    path: '/'
    // Domain tidak di-set untuk fleksibilitas IP
  }
};

// Export default options atau permissive berdasarkan environment
export const sessionOptions =
  process.env.DEBUG_SESSION === 'true'
    ? permissiveSessionOptions
    : {
        password: config.SESSION_SECRET || '',
        cookieName: 'glucoheart-session',
        cookieOptions: {
          secure:
            config.NODE_ENV === 'production' && config.USE_HTTPS === 'true',
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7, // 7 days
          sameSite:
            config.NODE_ENV === 'production' && config.USE_HTTPS !== 'true'
              ? 'lax'
              : ((config.NODE_ENV === 'production' ? 'none' : 'lax') as
                  | 'lax'
                  | 'strict'
                  | 'none'),
          path: '/'
        }
      };
