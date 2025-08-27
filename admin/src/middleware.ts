import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './types/entity';

export interface SessionData {
  isLoggedIn: boolean;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  isPublic?: boolean;
}

class RouteManager {
  private readonly routes: RouteConfig[] = [
    // Public routes
    { path: '/', allowedRoles: [], isPublic: true },

    // Auth routes
    { path: '/auth/sign-in', allowedRoles: [], isPublic: true },
    { path: '/auth/sign-up', allowedRoles: [], isPublic: true },

    // Dashboard base (all authenticated users)
    { path: '/dashboard', allowedRoles: ['ADMIN', 'SUPPORT', 'NURSE', 'USER'] },

    // Admin only routes
    { path: '/dashboard/users', allowedRoles: ['ADMIN'] },

    // Admin & Support routes
    { path: '/dashboard/overview', allowedRoles: ['ADMIN', 'SUPPORT'] },
    { path: '/dashboard/articles', allowedRoles: ['ADMIN', 'SUPPORT'] },
    {
      path: '/dashboard/article-categories',
      allowedRoles: ['ADMIN', 'SUPPORT']
    },
    { path: '/dashboard/chat-sessions', allowedRoles: ['ADMIN', 'SUPPORT'] },
    { path: '/dashboard/discussions', allowedRoles: ['ADMIN', 'SUPPORT'] }
  ];

  private readonly authPaths = ['/auth/sign-in', '/auth/sign-up'];
  private readonly protectedPaths = ['/dashboard'];

  /**
   * Check if path matches any pattern
   */
  private matchesPath(pathname: string, patterns: string[]): boolean {
    return patterns.some((pattern) => pathname.startsWith(pattern));
  }

  /**
   * Find the most specific route configuration for a path
   */
  findRouteConfig(pathname: string): RouteConfig | null {
    // Sort routes by path length (descending) to match most specific first
    const sortedRoutes = this.routes
      .filter((route) => pathname.startsWith(route.path))
      .sort((a, b) => b.path.length - a.path.length);

    return sortedRoutes[0] || null;
  }

  /**
   * Check if path is public
   */
  isPublicPath(pathname: string): boolean {
    const config = this.findRouteConfig(pathname);
    return config?.isPublic ?? false;
  }

  /**
   * Check if path is auth route
   */
  isAuthPath(pathname: string): boolean {
    return this.matchesPath(pathname, this.authPaths);
  }

  /**
   * Check if path is protected
   */
  isProtectedPath(pathname: string): boolean {
    return this.matchesPath(pathname, this.protectedPaths);
  }

  /**
   * Check if user has permission for path
   */
  hasPermission(pathname: string, userRole?: UserRole): boolean {
    if (this.isPublicPath(pathname)) return true;
    if (!userRole) return false;

    const config = this.findRouteConfig(pathname);
    if (!config) return false;

    return config.allowedRoles.includes(userRole);
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================
class SessionManager {
  /**
   * Fetch session data from API
   */
  static async getSessionData(request: NextRequest): Promise<SessionData> {
    try {
      const sessionCheckUrl = new URL('/api/auth/session', request.url);
      const sessionResponse = await fetch(sessionCheckUrl, {
        headers: {
          cookie: request.headers.get('cookie') || ''
        }
      });

      if (sessionResponse.ok) {
        return await sessionResponse.json();
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    }

    return { isLoggedIn: false };
  }

  /**
   * Get session from cookie
   */
  static async getSession(request: NextRequest): Promise<SessionData> {
    const sessionCookie = request.cookies.get('glucoheart-session');

    if (!sessionCookie?.value) {
      return { isLoggedIn: false };
    }

    return await this.getSessionData(request);
  }
}

// ============================================================================
// URL UTILITIES
// ============================================================================
class UrlUtils {
  /**
   * Create redirect URL with query parameters
   */
  static createRedirectUrl(
    request: NextRequest,
    path: string,
    params?: Record<string, string>
  ): URL {
    const url = new URL(path, request.url);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    return url;
  }
}

// ============================================================================
// RESPONSE HANDLERS
// ============================================================================
class ResponseHandler {
  /**
   * Handle unauthorized access
   */
  static handleUnauthorized(
    request: NextRequest,
    pathname: string,
    userRole?: UserRole
  ): NextResponse {
    const redirectUrl = UrlUtils.createRedirectUrl(request, '/dashboard', {
      error: 'unauthorized',
      message: `Access denied. Required role not met for ${pathname}`,
      userRole: userRole || 'unknown'
    });

    console.warn(
      `Unauthorized access attempt: ${userRole || 'unknown'} -> ${pathname}`
    );
    return NextResponse.redirect(redirectUrl);
  }

  /**
   * Handle unauthenticated access
   */
  static handleUnauthenticated(
    request: NextRequest,
    pathname: string
  ): NextResponse {
    const redirectUrl = UrlUtils.createRedirectUrl(request, '/auth/sign-in', {
      callbackUrl: pathname
    });

    console.info(
      `Unauthenticated access redirect: ${pathname} -> /auth/sign-in`
    );
    return NextResponse.redirect(redirectUrl);
  }

  /**
   * Handle authenticated users accessing auth pages
   */
  static handleAuthenticatedToAuth(request: NextRequest): NextResponse {
    const dashboardUrl = UrlUtils.createRedirectUrl(request, '/dashboard');
    console.info('Authenticated user redirected from auth page to dashboard');
    return NextResponse.redirect(dashboardUrl);
  }

  /**
   * Allow request to continue
   */
  static allowRequest(): NextResponse {
    return NextResponse.next();
  }
}

// ============================================================================
// MIDDLEWARE LOGIC
// ============================================================================
class MiddlewareProcessor {
  private routeManager: RouteManager;

  constructor() {
    this.routeManager = new RouteManager();
  }

  /**
   * Process middleware logic
   */
  async process(request: NextRequest): Promise<NextResponse> {
    const { pathname } = request.nextUrl;

    // Skip processing for API routes and static files
    if (this.shouldSkipMiddleware(pathname)) {
      return ResponseHandler.allowRequest();
    }

    try {
      const session = await SessionManager.getSession(request);
      return await this.handleRouting(request, pathname, session);
    } catch (error) {
      console.error('Middleware processing error:', error);
      return this.handleError(request, pathname);
    }
  }

  /**
   * Check if middleware should be skipped
   */
  private shouldSkipMiddleware(pathname: string): boolean {
    const skipPatterns = [
      '/api/',
      '/_next/static/',
      '/_next/image/',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml'
    ];

    return skipPatterns.some((pattern) => pathname.startsWith(pattern));
  }

  /**
   * Handle routing logic
   */
  private async handleRouting(
    request: NextRequest,
    pathname: string,
    session: SessionData
  ): Promise<NextResponse> {
    const { isLoggedIn, user } = session;
    const userRole = user?.role;

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🔍 Route check: ${pathname} | User: ${userRole || 'anonymous'} | Logged in: ${isLoggedIn}`
      );
    }

    // Public routes - allow everyone
    if (this.routeManager.isPublicPath(pathname)) {
      return ResponseHandler.allowRequest();
    }

    // Auth routes - redirect authenticated users to dashboard
    if (this.routeManager.isAuthPath(pathname) && isLoggedIn) {
      return ResponseHandler.handleAuthenticatedToAuth(request);
    }

    // Protected routes - require authentication
    if (this.routeManager.isProtectedPath(pathname)) {
      if (!isLoggedIn) {
        return ResponseHandler.handleUnauthenticated(request, pathname);
      }

      // Check role-based permissions
      if (!this.routeManager.hasPermission(pathname, userRole)) {
        return ResponseHandler.handleUnauthorized(request, pathname, userRole);
      }
    }

    return ResponseHandler.allowRequest();
  }

  /**
   * Handle errors
   */
  private handleError(request: NextRequest, pathname: string): NextResponse {
    // If error occurs on protected path, redirect to sign-in
    if (this.routeManager.isProtectedPath(pathname)) {
      return ResponseHandler.handleUnauthenticated(request, pathname);
    }

    return ResponseHandler.allowRequest();
  }
}

// ============================================================================
// MAIN MIDDLEWARE FUNCTION
// ============================================================================
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const processor = new MiddlewareProcessor();
  return await processor.process(request);
}

// ============================================================================
// CONFIGURATION
// ============================================================================
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'
  ]
};

// ============================================================================
// EXPORTS FOR TESTING/UTILITIES
// ============================================================================
export { RouteManager, SessionManager, UrlUtils, ResponseHandler };
