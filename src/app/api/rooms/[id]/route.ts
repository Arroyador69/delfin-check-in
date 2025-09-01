import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Buscar la habitación en el almacenamiento del servidor
    const roomIndex = global.serverStorage.rooms.findIndex((room: any) => room.id === id);
    
    if (roomIndex === -1) {
      return NextResponse.json(
        { error: 'Habitación no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la habitación
    global.serverStorage.rooms[roomIndex] = {
      ...global.serverStorage.rooms[roomIndex],
      ...body,
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(global.serverStorage.rooms[roomIndex]);
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
  try {
    const { id } = await params;

    // Buscar la habitación en el almacenamiento del servidor
    const room = global.serverStorage.rooms.find((room: any) => room.id === id);
    
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