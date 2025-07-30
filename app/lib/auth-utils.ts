import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
);

const JWT_ISSUER = 'freshservice-dashboard';
const JWT_AUDIENCE = 'freshservice-users';

export interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  iat?: number;
  exp?: number;
}

// Create a secure JWT session token
export async function createSession(user: Omit<SessionUser, 'iat' | 'exp'>): Promise<string> {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime('24h') // 24 hour expiry
    .sign(JWT_SECRET);

  return token;
}

// Verify and decode a JWT session token
export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as unknown as SessionUser;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

// Get the current session from cookies
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session-token');

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

// Set a secure session cookie
export async function setSessionCookie(user: Omit<SessionUser, 'iat' | 'exp'>) {
  const token = await createSession(user);
  const cookieStore = cookies();

  cookieStore.set('session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  // Clear the old basic session cookie
  cookieStore.delete('saml-session');
}

// Clear the session cookie
export function clearSession() {
  const cookieStore = cookies();
  cookieStore.delete('session-token');
  cookieStore.delete('saml-session');
}