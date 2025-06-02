import { NextRequest, NextResponse } from 'next/server'

// Handle any unexpected POST requests to the root
export async function POST(request: NextRequest) {
  console.log('⚠️ Unexpected POST request to /', request.url)
  
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