import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // If there's a token, try to call backend logout
    if (session.access_token) {
      try {
        // Optionally call backend logout endpoint
        // await api.post('/auth/logout', {}, {
        //   headers: { Authorization: `Bearer ${session.access_token}` }
        // });
      } catch (error) {
        // Continue with logout even if backend call fails
        console.warn('Backend logout failed:', error);
      }
    }

    // Clear session
    session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
