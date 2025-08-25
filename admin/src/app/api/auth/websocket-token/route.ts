import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';

export async function GET() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (!session.isLoggedIn || !session.access_token || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Return the access token for websocket authentication
    return NextResponse.json({
      token: session.access_token,
      user: session.user
    });
  } catch (error) {
    console.error('❌ WebSocket token error:', error);
    return NextResponse.json(
      { error: 'Failed to get websocket token' },
      { status: 500 }
    );
  }
}
