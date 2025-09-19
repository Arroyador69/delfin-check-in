import { NextRequest, NextResponse } from 'next/server';
import { getSentMessages } from '@/lib/db';

// GET - Obtener mensajes enviados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    
    const messages = await getSentMessages(limit);
    
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching sent messages:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener mensajes enviados' },
      { status: 500 }
    );
  }
}
