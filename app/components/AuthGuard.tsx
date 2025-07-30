'use client';

import { useSaml } from '../lib/saml-context';
import { Button } from './ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, login } = useSaml();

  // Development bypass - temporarily disabled for Okta testing
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('🔓 Development mode: Auth bypass enabled');
  //   return (
  //     <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
  //       {children}
  //     </div>
  //   );
  // }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to sign in to access the dashboard.
          </p>
          <Button onClick={login}>
            Sign In with Okta
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}