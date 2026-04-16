import { NextRequest, NextResponse } from 'next/server';
import { ensureFacturasTables, getRecibos, crearRecibo } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    await ensureFacturasTables();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const recibos = await getRecibos(tenantId, limit);
    return NextResponse.json({ recibos });
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    await ensureFacturasTables();

    const body = await request.json();

    if (!body.cliente_nombre || !body.concepto) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: cliente_nombre, concepto' },
        { status: 400 }
      );
    }

    const importeTotal = parseFloat(String(body.importe_total ?? ''));
    if (!Number.isFinite(importeTotal) || importeTotal <= 0) {
      return NextResponse.json({ error: 'El importe total debe ser un número positivo' }, { status: 400 });
    }

    const recibo = await crearRecibo({
      tenant_id: tenantId,
      cliente_nombre: body.cliente_nombre,
      cliente_tipo_documento: body.cliente_tipo_documento,
      cliente_nif: body.cliente_nif,
      cliente_direccion: body.cliente_direccion,
      cliente_codigo_postal: body.cliente_codigo_postal,
      cliente_ciudad: body.cliente_ciudad,
      cliente_provincia: body.cliente_provincia,
      cliente_pais: body.cliente_pais,
      concepto: body.concepto,
      descripcion: body.descripcion,
      fecha_pago: body.fecha_pago,
      fecha_estancia_desde: body.fecha_estancia_desde,
      fecha_estancia_hasta: body.fecha_estancia_hasta,
      importe_total: importeTotal,
      incluir_iva: Boolean(body.incluir_iva),
      iva_porcentaje: body.incluir_iva ? parseFloat(String(body.iva_porcentaje ?? 21)) : 0,
      forma_pago: body.forma_pago,
    });

    return NextResponse.json({ recibo }, { status: 201 });
  } catch (error) {
    console.error('Error al crear recibo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
