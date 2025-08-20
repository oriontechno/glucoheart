import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET() {
  try {
    console.log('🔍 Session check - Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      USE_HTTPS: process.env.USE_HTTPS,
      cookieOptions: sessionOptions.cookieOptions
    });

    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    console.log('🔍 Session check - Retrieved session:', {
      isLoggedIn: session.isLoggedIn,
      hasUser: !!session.user,
      hasToken: !!session.access_token,
      sessionData: session
    });

    if (!session.isLoggedIn || !session.user) {
      console.log('❌ Session check failed - User not authenticated');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('✅ Session check successful');
    return NextResponse.json({
      user: session.user,
      access_token: session.access_token,
      isLoggedIn: session.isLoggedIn
    });
  } catch (error) {
    console.error('❌ Session check error:', error);
    return NextResponse.json(
      { error: 'Session check failed' },
      { status: 500 }
    );
  }
}
