/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setAuthToken, removeAuthToken, getAuthToken } from '../lib/api-client';

interface User {
  id: string;
  email: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, address?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          // Try to get user info from backend to validate token
          // For now, we'll decode the JWT to get user info if possible
          // Or make a simple API call to validate
          // Since we don't have a /me endpoint, we'll just check if token exists
          // and set a basic user state
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            try {
              const payload = JSON.parse(atob(tokenParts[1]));
              // Set user from token payload if available
              if (payload.sub || payload.user_id) {
                setUser({
                  id: payload.sub || payload.user_id,
                  email: payload.email || '',
                  address: payload.address,
                });
              }
            } catch (e) {
              // If we can't decode, that's okay - user will need to login again
              console.log('Could not decode token');
            }
          }
        } catch (error) {
          // Token might be invalid, clear it
          removeAuthToken();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email || email,
          address: response.user.address,
        });
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (email: string, password: string, address?: string) => {
    try {
      const response = await authAPI.signup(email, password, address);
      if (response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email || email,
          address: response.user.address || address,
        });
        // Auto-login after signup
        if (response.session?.access_token) {
          setAuthToken(response.session.access_token);
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Export hook separately to avoid Fast Refresh issues
function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { useAuth };

