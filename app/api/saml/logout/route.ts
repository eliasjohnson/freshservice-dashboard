import { NextRequest, NextResponse } from 'next/server';
import { clearSession } from '../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Clear the secure session
    clearSession();

    console.log('✅ User logged out successfully');

    // In a real implementation, you might also want to:
    // 1. Initiate SAML SingleLogout if supported
    // 2. Clear any other session data
    // 3. Log the logout event for security auditing

    // Redirect to home page or login page
    const baseUrl = request.url.includes('localhost') ? 'http://localhost:3000' : `https://${request.headers.get('host')}`;
    return NextResponse.redirect(new URL('/', baseUrl));
  } catch (error) {
    console.error('SAML logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}