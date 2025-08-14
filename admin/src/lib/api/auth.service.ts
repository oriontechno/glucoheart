interface SignInRequest {
  email: string;
  password: string;
}

interface SignInResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string;
  };
}

interface SessionResponse {
  user: SignInResponse['user'];
  isLoggedIn: boolean;
}

interface ErrorResponse {
  error: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export const authService = {
  signIn: async (email: string, password: string): Promise<SignInResponse> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          error: data.error || 'Login failed',
          errors: data.errors || []
        } as ErrorResponse;
      }

      return data;
    } catch (error) {
      // Handle fetch errors
      if (error instanceof TypeError) {
        throw {
          error: 'Network error. Please check your connection.',
          errors: []
        } as ErrorResponse;
      }

      // Re-throw API errors
      throw error;
    }
  },

  signOut: async (): Promise<void> => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn('Logout API call failed');
      }
    } catch (error) {
      console.warn('Logout failed:', error);
    }
  },

  getSession: async (): Promise<SessionResponse | null> => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('Session check failed:', error);
      return null;
    }
  },

  // Check if user is authenticated (client-side helper)
  isAuthenticated: async (): Promise<boolean> => {
    const session = await authService.getSession();
    return session?.isLoggedIn ?? false;
  }
};
