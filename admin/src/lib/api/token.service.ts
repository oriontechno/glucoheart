class TokenService {
  private token: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  // Set token in memory
  setToken(token: string): void {
    this.token = token;
  }

  // Get token from memory or session
  async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    // If no token in memory, try to get from session (client-side only)
    if (typeof window !== 'undefined') {
      return this.getTokenFromSession();
    }

    return null;
  }

  // Get token from session API
  private async getTokenFromSession(): Promise<string | null> {
    // Only run on client-side
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          this.setToken(data.access_token);
          return data.access_token;
        }
      }
    } catch (error) {
      console.warn('Failed to get token from session:', error);
    }
    return null;
  }

  // Clear token
  clearToken(): void {
    this.token = null;
    this.refreshPromise = null;
  }

  // Check if token exists
  hasToken(): boolean {
    return this.token !== null;
  }

  // Refresh token with deduplication
  async refreshToken(): Promise<string | null> {
    // Only refresh on client-side
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.getTokenFromSession();
    const token = await this.refreshPromise;
    this.refreshPromise = null;

    return token;
  }
}

export const tokenService = new TokenService();
