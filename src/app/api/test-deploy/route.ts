import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Deployment forzado exitosamente',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
}
