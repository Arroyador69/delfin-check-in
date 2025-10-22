import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo debe ser menor a 2MB' }, { status: 400 });
    }

    // Convertir a base64 para almacenar en la base de datos
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ 
      success: true, 
      logoUrl: dataUrl,
      filename: file.name 
    });

  } catch (error) {
    console.error('Error al subir logo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
