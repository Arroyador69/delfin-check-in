import { NextRequest, NextResponse } from 'next/server';
import { ensureFacturasTables, getReciboById, getEmpresaConfig } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';
import { generarPdfRecibo } from '@/lib/pdf-recibo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    await ensureFacturasTables();

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'ID de recibo inválido' }, { status: 400 });
    }

    const [recibo, empresaConfig] = await Promise.all([
      getReciboById(id, tenantId),
      getEmpresaConfig(tenantId),
    ]);

    if (!recibo) {
      return NextResponse.json({ error: 'Recibo no encontrado' }, { status: 404 });
    }
    if (!empresaConfig) {
      return NextResponse.json({ error: 'Configuración de empresa no encontrada' }, { status: 404 });
    }

    recibo.importe_total = parseFloat(String(recibo.importe_total ?? 0));
    recibo.base_imponible = parseFloat(String(recibo.base_imponible ?? 0));
    recibo.iva_importe = parseFloat(String(recibo.iva_importe ?? 0));
    recibo.iva_porcentaje = parseFloat(String(recibo.iva_porcentaje ?? 0));
    recibo.incluir_iva = Boolean(recibo.incluir_iva);

    const pdf = generarPdfRecibo(recibo, empresaConfig);
    const filename = `recibo_${recibo.numero_recibo}.pdf`;
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error al generar PDF recibo:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
