import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ 
      authenticated: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
      }
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}