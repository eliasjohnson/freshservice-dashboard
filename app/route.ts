import { NextRequest, NextResponse } from 'next/server'

// Handle any POST requests to the root domain
export async function POST(request: NextRequest) {
  console.log('⚠️ Unexpected POST request to root /')
  console.log('📋 Headers:', Object.fromEntries(request.headers.entries()))
  console.log('🔗 Referer:', request.headers.get('referer'))
  console.log('🌐 URL:', request.url)
  
  // Redirect POST requests to GET for the same URL
  return NextResponse.redirect(request.url.replace('http://', 'https://'), 303)
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