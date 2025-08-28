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

// Deteksi environment untuk konfigurasi cookie yang tepat
const isProduction = config.NODE_ENV === 'production';
const useHTTPS = config.USE_HTTPS === 'true';
const isVPSWithHTTP = isProduction && !useHTTPS;

export const sessionOptions: SessionOptions = {
  password: config.SESSION_SECRET || '',
  cookieName: 'glucoheart-session',
  cookieOptions: {
    // Hanya secure jika production dan menggunakan HTTPS
    secure: isProduction && useHTTPS,
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24 hours
    // Sesuaikan sameSite berdasarkan environment
    sameSite: isVPSWithHTTP ? 'lax' : isProduction ? 'none' : 'lax',
    path: '/',
    // Tidak set domain untuk fleksibilitas IP address
    ...(isVPSWithHTTP && {
      domain: undefined
    })
  }
};
