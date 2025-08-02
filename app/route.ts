import { NextRequest, NextResponse } from 'next/server'

// Handle any POST requests to the root domain
export async function POST(request: NextRequest) {
  console.log('⚠️ Unexpected POST request to root /')
  console.log('📋 Headers:', Object.fromEntries(request.headers.entries()))
  console.log('🔗 Referer:', request.headers.get('referer'))
  console.log('🌐 URL:', request.url)
  
  // Check if this might be from a SAML redirect
  const referer = request.headers.get('referer')
  if (referer && referer.includes('/api/saml/callback')) {
    console.log('📝 Detected POST from SAML callback, converting to GET')
  }
  
  // Always redirect POST requests to GET using 303 status
  const url = new URL(request.url)
  url.protocol = 'https:' // Ensure HTTPS
  return NextResponse.redirect(url.toString(), 303)
}

// Handle OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  console.log('🔧 OPTIONS request to root /')
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}