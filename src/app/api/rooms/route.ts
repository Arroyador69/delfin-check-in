import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { roomSchema } from '@/lib/validation';

export async function GET() {
  try {
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Error al obtener las habitaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = roomSchema.parse(body);

    const { data, error } = await supabase
      .from('rooms')
      .insert([validatedData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Error al crear la habitación' },
      { status: 500 }
    );
  }
}
