import { NextRequest, NextResponse } from 'next/server';
import { getFacturas, crearFactura } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const facturas = await getFacturas(tenantId, limit);
    
    return NextResponse.json({ facturas });
  } catch (error) {
    console.error('Error al obtener facturas:', error);
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

    const body = await request.json();
    
    // Validar datos requeridos
    if (!body.cliente_nombre || !body.concepto || !body.precio_base) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: cliente_nombre, concepto, precio_base' },
        { status: 400 }
      );
    }

    // Validar que el precio sea un número positivo
    if (typeof body.precio_base !== 'number' || body.precio_base <= 0) {
      return NextResponse.json(
        { error: 'El precio debe ser un número positivo' },
        { status: 400 }
      );
    }

    const factura = await crearFactura({
      tenant_id: tenantId,
      cliente_nombre: body.cliente_nombre,
      cliente_nif: body.cliente_nif,
      cliente_direccion: body.cliente_direccion,
      cliente_codigo_postal: body.cliente_codigo_postal,
      cliente_ciudad: body.cliente_ciudad,
      cliente_provincia: body.cliente_provincia,
      cliente_pais: body.cliente_pais,
      concepto: body.concepto,
      descripcion: body.descripcion,
      precio_base: body.precio_base,
      iva_porcentaje: body.iva_porcentaje,
      forma_pago: body.forma_pago,
    });

    return NextResponse.json({ factura }, { status: 201 });
  } catch (error) {
    console.error('Error al crear factura:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
