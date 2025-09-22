import { NextRequest, NextResponse } from 'next/server';
import { getRooms, updateRoom, getRoomById } from '@/lib/storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { id } = await params;
    const body = await request.json();

    // Buscar la habitación en el almacenamiento
    const roomIndex = getRooms().findIndex((room: any) => room.id === id);
    
    if (roomIndex === -1) {
      return NextResponse.json(
        { error: 'Habitación no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la habitación
    const updatedRoom = {
      ...getRooms()[roomIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    updateRoom(id, updatedRoom);

    return NextResponse.json(updatedRoom);
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la habitación' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { id } = await params;

    // Buscar la habitación en el almacenamiento
    const room = getRoomById(id);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Habitación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Error al obtener la habitación' },
      { status: 500 }
    );
  }
}