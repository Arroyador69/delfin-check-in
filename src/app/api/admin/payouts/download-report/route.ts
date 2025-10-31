// =====================================================
// API: DESCARGAR REPORTE DE PAGOS EN PDF
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import jsPDF from 'jspdf';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Obtener información del tenant
    const tenantResult = await sql`
      SELECT name, email FROM tenants WHERE id = ${tenantId}
    `;

    const tenantName = tenantResult.rows[0]?.name || 'Propietario';

    // Obtener pagos
    let paymentsQuery = sql`
      SELECT 
        dr.reservation_code,
        dr.check_in_date,
        dr.check_out_date,
        dr.total_amount,
        dr.stripe_fee_amount,
        dr.delfin_commission_amount,
        dr.property_owner_amount,
        ct.status,
        ct.processed_at
      FROM direct_reservations dr
      LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
      WHERE dr.tenant_id = ${tenantId}
        AND dr.reservation_status IN ('confirmed', 'completed')
        AND dr.payment_status = 'paid'
    `;

    if (startDate && endDate) {
      paymentsQuery = sql`
        SELECT 
          dr.reservation_code,
          dr.check_in_date,
          dr.check_out_date,
          dr.total_amount,
          dr.stripe_fee_amount,
          dr.delfin_commission_amount,
          dr.property_owner_amount,
          ct.status,
          ct.processed_at
        FROM direct_reservations dr
        LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id
        WHERE dr.tenant_id = ${tenantId}
          AND dr.reservation_status IN ('confirmed', 'completed')
          AND dr.payment_status = 'paid'
          AND dr.check_in_date >= ${startDate}
          AND dr.check_in_date <= ${endDate}
      `;
    }

    const payments = await paymentsQuery;

    // Generar PDF
    const doc = new jsPDF();
    
    // Configuración de colores
    const primaryColor = [59, 130, 246]; // blue-500
    const grayColor = [107, 114, 128]; // gray-500
    const lightGrayColor = [243, 244, 246]; // gray-100

    // Título
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.text('Reporte de Pagos Microsite', 20, 30);

    // Información del propietario
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Propietario: ${tenantName}`, 20, 50);
    
    const dateRange = startDate && endDate 
      ? `Desde ${startDate} hasta ${endDate}`
      : `Todos los pagos`;
    doc.text(`Periodo: ${dateRange}`, 20, 60);
    doc.text(`Fecha del reporte: ${new Date().toLocaleDateString('es-ES')}`, 20, 70);

    // Tabla de pagos
    let yPos = 90;

    // Cabecera de tabla
    doc.setFillColor(...lightGrayColor);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    doc.text('Reserva', 22, yPos + 7);
    doc.text('Fechas', 50, yPos + 7);
    doc.text('Total', 85, yPos + 7);
    doc.text('Com. Stripe', 110, yPos + 7);
    doc.text('Com. Delfin', 145, yPos + 7);
    doc.text('Recibido', 175, yPos + 7);

    yPos += 10;

    // Filas de pagos
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    let totalReservas = 0;
    let totalComisionStripe = 0;
    let totalComisionDelfin = 0;
    let totalRecibido = 0;

    for (const payment of payments.rows) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const reserva = payment.reservation_code;
      const checkIn = new Date(payment.check_in_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const checkOut = new Date(payment.check_out_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const total = parseFloat(payment.total_amount);
      const comStripe = parseFloat(payment.stripe_fee_amount || 0);
      const comDelfin = parseFloat(payment.delfin_commission_amount);
      const recibido = parseFloat(payment.property_owner_amount);

      doc.text(reserva.substring(0, 10), 22, yPos + 7);
      doc.text(`${checkIn}-${checkOut}`, 50, yPos + 7);
      doc.text(`${total.toFixed(2)}€`, 85, yPos + 7);
      doc.text(`${comStripe.toFixed(2)}€`, 110, yPos + 7);
      doc.text(`${comDelfin.toFixed(2)}€`, 145, yPos + 7);
      doc.text(`${recibido.toFixed(2)}€`, 175, yPos + 7);

      totalReservas += total;
      totalComisionStripe += comStripe;
      totalComisionDelfin += comDelfin;
      totalRecibido += recibido;

      yPos += 7;
    }

    // Totales
    yPos += 5;
    doc.setFillColor(...lightGrayColor);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    doc.text('TOTALES', 22, yPos + 7);
    doc.text(`${totalReservas.toFixed(2)}€`, 85, yPos + 7);
    doc.text(`${totalComisionStripe.toFixed(2)}€`, 110, yPos + 7);
    doc.text(`${totalComisionDelfin.toFixed(2)}€`, 145, yPos + 7);
    doc.text(`${totalRecibido.toFixed(2)}€`, 175, yPos + 7);

    // Footer
    yPos += 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text('Este documento es un resumen de las comisiones aplicadas a las reservas directas de tu microsite.', 20, yPos);
    doc.text('Para más información, contacta con soporte@delfincheckin.com', 20, yPos + 5);

    // Generar respuesta
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=reporte_pagos_${new Date().toISOString().split('T')[0]}.pdf`
      }
    });

  } catch (error: any) {
    console.error('❌ Error generando reporte PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Error generando reporte' },
      { status: 500 }
    );
  }
}

