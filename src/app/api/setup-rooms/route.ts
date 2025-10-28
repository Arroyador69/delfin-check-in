import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST() {
  try {
    console.log('⚠️ Este endpoint está deshabilitado para evitar crear la tabla rooms incorrecta');
    
    return NextResponse.json({ 
      success: false, 
      message: 'Este endpoint está deshabilitado. Usa solo la tabla Room (con mayúscula).' 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Endpoint deshabilitado' },
      { status: 400 }
    );
  }
}
