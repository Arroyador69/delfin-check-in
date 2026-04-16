import { NextRequest, NextResponse } from 'next/server';
import { getFacturaById, getEmpresaConfig, actualizarPdfFactura, ensureFacturasTables } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(request);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID no encontrado' }, { status: 401 });
    }

    // Asegurar que las tablas existan
    await ensureFacturasTables();

    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de factura inválido' }, { status: 400 });
    }

    // Obtener factura y configuración de empresa
    const [factura, empresaConfig] = await Promise.all([
      getFacturaById(id, tenantId),
      getEmpresaConfig(tenantId)
    ]);

    // Asegurar que los campos numéricos sean números
    if (factura) {
      factura.precio_base = parseFloat(factura.precio_base || 0);
      factura.iva_importe = parseFloat(factura.iva_importe || 0);
      factura.total = parseFloat(factura.total || 0);
      factura.iva_porcentaje = parseFloat(factura.iva_porcentaje || 21);
    }

    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }

    if (!empresaConfig) {
      return NextResponse.json({ error: 'Configuración de empresa no encontrada' }, { status: 404 });
    }

    // Generar PDF
    const pdf = generarPdfFactura(factura, empresaConfig);
    
    // Generar nombre de archivo
    const filename = `factura_${factura.numero_factura}.pdf`;
    
    // Convertir a buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    
    // Crear respuesta con el PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error al generar PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

function generarPdfFactura(factura: any, empresaConfig: any): jsPDF {
  const doc = new jsPDF();
  const getDocumentLabel = (value: unknown) => {
    switch (String(value || 'dni').toLowerCase()) {
      case 'nie':
        return 'NIE';
      case 'pasaporte':
        return 'Pasaporte';
      default:
        return 'DNI';
    }
  };
  
  // Configuración de colores
  const primaryColor = [59, 130, 246]; // blue-500
  const grayColor = [107, 114, 128]; // gray-500
  const lightGrayColor = [243, 244, 246]; // gray-100
  
  // Configuración de fuentes
  const fontSize = {
    title: 20,
    subtitle: 14,
    normal: 10,
    small: 8
  };

  // Título
  doc.setFontSize(fontSize.title);
  doc.setTextColor(...primaryColor);
  doc.text('FACTURA', 20, 30);
  
  // Número de factura
  doc.setFontSize(fontSize.subtitle);
  doc.setTextColor(...grayColor);
  doc.text(`Nº ${factura.numero_factura}`, 150, 30);
  
  // Fecha de emisión
  doc.setFontSize(fontSize.normal);
  doc.text(`Fecha: ${new Date(factura.fecha_emision).toLocaleDateString('es-ES')}`, 150, 40);

  // Datos de la empresa
  doc.setFontSize(fontSize.subtitle);
  doc.setTextColor(0, 0, 0);
  doc.text('EMISOR', 20, 60);
  
  doc.setFontSize(fontSize.normal);
  doc.text(empresaConfig.nombre_empresa, 20, 70);
  doc.text(`NIF: ${empresaConfig.nif_empresa}`, 20, 80);
  doc.text(empresaConfig.direccion_empresa, 20, 90);
  
  if (empresaConfig.codigo_postal && empresaConfig.ciudad) {
    doc.text(`${empresaConfig.codigo_postal} ${empresaConfig.ciudad}`, 20, 100);
  }
  
  if (empresaConfig.provincia) {
    doc.text(empresaConfig.provincia, 20, 110);
  }
  
  if (empresaConfig.telefono) {
    doc.text(`Tel: ${empresaConfig.telefono}`, 20, 120);
  }
  
  if (empresaConfig.email) {
    doc.text(`Email: ${empresaConfig.email}`, 20, 130);
  }

  // Datos del cliente
  doc.setFontSize(fontSize.subtitle);
  doc.text('CLIENTE', 110, 60);
  
  doc.setFontSize(fontSize.normal);
  doc.text(factura.cliente_nombre, 110, 70);
  
  if (factura.cliente_nif) {
    doc.text(`${getDocumentLabel(factura.cliente_tipo_documento)}: ${factura.cliente_nif}`, 110, 80);
  }
  
  if (factura.cliente_direccion) {
    doc.text(factura.cliente_direccion, 110, 90);
  }
  
  if (factura.cliente_codigo_postal && factura.cliente_ciudad) {
    doc.text(`${factura.cliente_codigo_postal} ${factura.cliente_ciudad}`, 110, 100);
  }
  
  if (factura.cliente_provincia) {
    doc.text(factura.cliente_provincia, 110, 110);
  }

  // Línea separadora
  doc.setDrawColor(...lightGrayColor);
  doc.line(20, 140, 190, 140);

  // Tabla de conceptos
  const tableY = 150;
  
  // Encabezados de tabla
  doc.setFillColor(...lightGrayColor);
  doc.rect(20, tableY, 170, 10, 'F');
  
  doc.setFontSize(fontSize.normal);
  doc.setTextColor(0, 0, 0);
  doc.text('Concepto', 22, tableY + 7);
  doc.text('Precio Base', 120, tableY + 7);
  doc.text('IVA', 150, tableY + 7);
  doc.text('Total', 170, tableY + 7);

  // Fila de datos
  const dataY = tableY + 10;
  doc.rect(20, dataY, 170, 15, 'S');
  
  // Concepto
  doc.text(factura.concepto, 22, dataY + 7);
  
  // Precio base
  doc.text(`${parseFloat(factura.precio_base || 0).toFixed(2)} €`, 120, dataY + 7);
  
  // IVA
  doc.text(`${parseFloat(factura.iva_importe || 0).toFixed(2)} €`, 150, dataY + 7);
  
  // Total
  doc.text(`${parseFloat(factura.total || 0).toFixed(2)} €`, 170, dataY + 7);

  // Descripción si existe
  if (factura.descripcion) {
    doc.setFontSize(fontSize.small);
    doc.setTextColor(...grayColor);
    doc.text(factura.descripcion, 22, dataY + 12);
  }

  // Totales
  const totalY = dataY + 25;
  doc.setFontSize(fontSize.normal);
  doc.setTextColor(0, 0, 0);
  
  doc.text('Subtotal:', 120, totalY);
  doc.text(`${parseFloat(factura.precio_base || 0).toFixed(2)} €`, 170, totalY);
  
  doc.text(`IVA (${parseFloat(factura.iva_porcentaje || 21)}%):`, 120, totalY + 10);
  doc.text(`${parseFloat(factura.iva_importe || 0).toFixed(2)} €`, 170, totalY + 10);
  
  // Total final
  doc.setFontSize(fontSize.subtitle);
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', 120, totalY + 25);
  doc.text(`${parseFloat(factura.total || 0).toFixed(2)} €`, 170, totalY + 25);

  // Línea separadora
  doc.setDrawColor(...lightGrayColor);
  doc.line(20, totalY + 30, 190, totalY + 30);

  // Forma de pago si existe
  if (factura.forma_pago) {
    doc.setFontSize(fontSize.normal);
    doc.setTextColor(0, 0, 0);
    doc.text(`Forma de pago: ${factura.forma_pago}`, 20, totalY + 45);
  }

  // Pie de página
  const footerY = 280;
  doc.setFontSize(fontSize.small);
  doc.setTextColor(...grayColor);
  doc.text('Gracias por su confianza', 20, footerY);
  doc.text('Factura generada automáticamente por Delfín Check-in', 20, footerY + 10);

  return doc;
}
