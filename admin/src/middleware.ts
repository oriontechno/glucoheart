import { NextRequest, NextResponse } from 'next/server';

// List of paths that require authentication
const protectedPaths = [
  '/dashboard',
  '/articles',
  '/users',
  '/chat',
  '/discussion'
];

// List of paths that should redirect to dashboard if already authenticated
const authPaths = ['/auth/sign-in', '/auth/sign-up'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path requires authentication
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  );
  const isAuthPath = authPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath || isAuthPath) {
    try {
      // Get session cookie
      const sessionCookie = request.cookies.get('glucoheart-session');
      let isLoggedIn = false;

      if (sessionCookie?.value) {
        try {
          // Simple approach: call our session API to check auth status
          // This avoids the complexity of decrypting cookies in middleware
          const sessionCheckUrl = new URL('/api/auth/session', request.url);
          const sessionResponse = await fetch(sessionCheckUrl, {
            headers: {
              cookie: request.headers.get('cookie') || ''
            }
          });

          const sessionData = await sessionResponse.json();

          if (sessionResponse.ok) {
            isLoggedIn = sessionData.isLoggedIn === true;
          }
        } catch (error) {
          console.error('Failed to check session:', error);
          isLoggedIn = false;
        }
      }

      // If trying to access protected path without auth
      if (isProtectedPath && !isLoggedIn) {
        const url = new URL('/auth/sign-in', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }

      // If trying to access auth pages while already logged in
      if (isAuthPath && isLoggedIn) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('Middleware session check failed:', error);

      // If session check fails and trying to access protected path
      if (isProtectedPath) {
        const url = new URL('/auth/sign-in', request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)'
  ]
};
