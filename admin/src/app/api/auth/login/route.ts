import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import api from '@/lib/axios';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call backend login API
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { access_token, user } = response.data;

    // Get session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    if (user.role === 'NURSE' || user.role === 'USER') {
      return NextResponse.json({
        success: true,
        user
      });
    }

    // Store session data
    session.access_token = access_token;
    session.user = user;
    session.isLoggedIn = true;

    await session.save();

    return NextResponse.json({
      success: true,
      user
    });
  } catch (error: any) {
    console.error('Login error:', error);

    // Handle axios errors
    if (error.response) {
      return NextResponse.json(
        {
          error: error.response.data.message || 'Login failed',
          errors: error.response.data.errors || []
        },
        { status: error.response.status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
