'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface SamlUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

interface SamlContextType {
  user: SamlUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const SamlContext = createContext<SamlContextType | undefined>(undefined);

export function SamlProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SamlUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by looking for session cookie
    const checkAuth = async () => {
      try {
        // Check if we're in development bypass mode
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true') {
          console.log('🔧 Development mode: bypassing SAML authentication');
          setUser({
            id: 'dev-user',
            email: process.env.NEXT_PUBLIC_DEV_USER_EMAIL || 'dev@pattern.com',
            firstName: 'Development',
            lastName: 'User',
            displayName: process.env.NEXT_PUBLIC_DEV_USER_NAME || 'Development User'
          });
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/saml/session');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = () => {
    window.location.href = '/api/saml/login';
  };

  const logout = () => {
    window.location.href = '/api/saml/logout';
  };

  const value: SamlContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <SamlContext.Provider value={value}>
      {children}
    </SamlContext.Provider>
  );
}

export function useSaml() {
  const context = useContext(SamlContext);
  if (context === undefined) {
    throw new Error('useSaml must be used within a SamlProvider');
  }
  return context;
}