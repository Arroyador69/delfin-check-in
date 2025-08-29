import { NextRequest, NextResponse } from 'next/server';
import { generateICalForRoom } from '@/lib/ical-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    
    if (!roomId) {
      return new NextResponse('Room ID is required', { status: 400 });
    }
    
    const icalContent = generateICalForRoom(roomId);
    
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${roomId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating iCal:', error);
    return new NextResponse('Error generating iCal', { status: 500 });
  }
}
