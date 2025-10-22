import { NextRequest, NextResponse } from 'next/server';
import { getEmpresaConfig, upsertEmpresaConfig, ensureFacturasTables } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    // Asegurar que las tablas existan
    await ensureFacturasTables();

    const config = await getEmpresaConfig(tenantId);
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error al obtener configuración de empresa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    // Asegurar que las tablas existan
    await ensureFacturasTables();

    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.nombre_empresa || !body.nif_empresa || !body.direccion_empresa) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: nombre_empresa, nif_empresa, direccion_empresa' },
        { status: 400 }
      );
    }

    const config = await upsertEmpresaConfig({
      tenant_id: tenantId,
      nombre_empresa: body.nombre_empresa,
      nif_empresa: body.nif_empresa,
      direccion_empresa: body.direccion_empresa,
      codigo_postal: body.codigo_postal,
      ciudad: body.ciudad,
      provincia: body.provincia,
      pais: body.pais,
      telefono: body.telefono,
      email: body.email,
      web: body.web,
      logo_url: body.logo_url,
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('Error al guardar configuración de empresa:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
