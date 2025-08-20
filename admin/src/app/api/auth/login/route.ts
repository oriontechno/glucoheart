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

    console.log({ response: response.data });

    const { access_token, user } = response.data;

    // Get session
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    console.log('Session data sebelum disimpan:');
    console.log({ session });

    // Store session data
    session.access_token = access_token;
    session.user = user;
    session.isLoggedIn = true;

    console.log('Session data setelah disimpan:');
    console.log({ session });

    await session.save();

    // Debug environment dan cookie settings
    console.log('Environment Debug:', {
      NODE_ENV: process.env.NODE_ENV,
      USE_HTTPS: process.env.USE_HTTPS,
      isProduction: process.env.NODE_ENV === 'production',
      useHTTPS: process.env.USE_HTTPS === 'true',
      cookieOptions: {
        secure:
          process.env.NODE_ENV === 'production' &&
          process.env.USE_HTTPS === 'true',
        sameSite:
          process.env.NODE_ENV === 'production' &&
          !(process.env.USE_HTTPS === 'true')
            ? 'lax'
            : process.env.NODE_ENV === 'production'
              ? 'none'
              : 'lax'
      }
    });

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
