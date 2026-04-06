import { NextRequest, NextResponse } from 'next/server';
import { ensureFacturasTables, getReciboById, eliminarRecibo } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    await ensureFacturasTables();

    const { id: idParam } = await Promise.resolve(params);
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID de recibo inválido' }, { status: 400 });
    }

    const recibo = await getReciboById(id, tenantId);
    if (!recibo) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ recibo });
  } catch (error) {
    console.error('Error al obtener recibo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    await ensureFacturasTables();

    const { id: idParam } = await Promise.resolve(params);
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID de recibo inválido' }, { status: 400 });
    }

    const ok = await eliminarRecibo(id, tenantId);
    if (!ok) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar recibo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
