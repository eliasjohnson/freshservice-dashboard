import { NextRequest, NextResponse } from 'next/server'

// Handle any unexpected POST requests to the root
export async function POST(request: NextRequest) {
  console.log('⚠️ Unexpected POST request to /api')
  console.log('📋 Headers:', Object.fromEntries(request.headers.entries()))
  console.log('🔗 Referer:', request.headers.get('referer'))
  
  // Return a simple response instead of 404
  return NextResponse.json(
    { 
      message: 'Dashboard API - POST not expected here',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}

// Also handle GET requests for completeness
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      message: 'Freshservice Dashboard API',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  )
}

// Handle OPTIONS requests
export async function OPTIONS(request: NextRequest) {
  console.log('🔧 OPTIONS request to root API');
  return new Response(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 