import { NextResponse } from 'next/server'

export async function GET() {
  const USER = process.env.AUTH_USER
  const PASS = process.env.AUTH_PASS
  
  return NextResponse.json({
    message: 'Test endpoint',
    hasUser: !!USER,
    hasPass: !!PASS,
    userLength: USER?.length || 0,
    passLength: PASS?.length || 0,
    userFirstChar: USER?.[0] || 'none',
    passFirstChar: PASS?.[0] || 'none'
  })
}
