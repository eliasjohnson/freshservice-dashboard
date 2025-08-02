import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

// Simple in-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(ip: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = `rate_limit_${ip}`;
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset or first request
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback
  return request.ip || 'unknown';
}

// CSRF protection for state-changing operations
export function validateReferer(request: NextRequest): boolean {
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  if (!referer && !origin) {
    return false;
  }
  
  const allowedOrigins = [
    `https://${host}`,
    `https://freshservice-dashboard.vercel.app`,
  ];
  
  const sourceOrigin = referer ? new URL(referer).origin : origin;
  
  return allowedOrigins.includes(sourceOrigin || '');
}

// Security headers helper
export function addSecurityHeaders(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute