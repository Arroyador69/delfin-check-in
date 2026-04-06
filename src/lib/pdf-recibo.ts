import jsPDF from 'jspdf';

/**
 * PDF de recibo de pago (acreditación de cobro).
 * Sin desglose IVA: solo confirma importe percibido.
 * Con IVA: muestra base + IVA (no equivale a factura completa fiscal sin más datos).
 */
export function generarPdfRecibo(recibo: Record<string, unknown>, empresaConfig: Record<string, unknown>): jsPDF {
  const doc = new jsPDF();

  const primaryColor: [number, number, number] = [16, 185, 129]; // emerald
  const grayColor: [number, number, number] = [107, 114, 128];
  const lightGrayColor: [number, number, number] = [243, 244, 246];

  const fontSize = {
    title: 18,
    subtitle: 14,
    normal: 10,
    small: 8,
  };

  const safeStr = (v: unknown) => (v == null ? '' : String(v));
  const fmtDateEs = (v: unknown) => {
    if (v == null || v === '') return '';
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? safeStr(v) : d.toLocaleDateString('es-ES');
  };
  const safeNum = (v: unknown) => {
    const n = parseFloat(String(v ?? '0'));
    return Number.isFinite(n) ? n : 0;
  };

  const incluirIva = Boolean(recibo.incluir_iva);

  doc.setFontSize(fontSize.title);
  doc.setTextColor(...primaryColor);
  doc.text('RECIBO DE PAGO', 20, 28);

  doc.setFontSize(fontSize.subtitle);
  doc.setTextColor(...grayColor);
  doc.text(`Nº ${safeStr(recibo.numero_recibo)}`, 150, 28);

  doc.setFontSize(fontSize.normal);
  doc.text(`Fecha: ${new Date(String(recibo.fecha_emision)).toLocaleDateString('es-ES')}`, 150, 38);

  doc.setFontSize(fontSize.subtitle);
  doc.setTextColor(0, 0, 0);
  doc.text('EMISOR', 20, 56);

  const lineStep = 10;
  let leftY = 66;
  doc.setFontSize(fontSize.normal);
  doc.text(safeStr(empresaConfig.nombre_empresa), 20, leftY);
  leftY += lineStep;
  doc.text(`NIF: ${safeStr(empresaConfig.nif_empresa)}`, 20, leftY);
  leftY += lineStep;
  doc.text(safeStr(empresaConfig.direccion_empresa), 20, leftY);
  leftY += lineStep;
  if (empresaConfig.codigo_postal && empresaConfig.ciudad) {
    doc.text(`${safeStr(empresaConfig.codigo_postal)} ${safeStr(empresaConfig.ciudad)}`, 20, leftY);
    leftY += lineStep;
  }
  if (empresaConfig.provincia) {
    doc.text(safeStr(empresaConfig.provincia), 20, leftY);
    leftY += lineStep;
  }
  if (empresaConfig.telefono) {
    doc.text(`Tel: ${safeStr(empresaConfig.telefono)}`, 20, leftY);
    leftY += lineStep;
  }
  if (empresaConfig.email) {
    doc.text(`Email: ${safeStr(empresaConfig.email)}`, 20, leftY);
    leftY += lineStep;
  }

  doc.setFontSize(fontSize.subtitle);
  doc.text('PAGADOR / CLIENTE', 110, 56);
  doc.setFontSize(fontSize.normal);
  let cy = 66;
  doc.text(safeStr(recibo.cliente_nombre), 110, cy);
  cy += lineStep;
  if (recibo.cliente_nif) {
    doc.text(`NIF: ${safeStr(recibo.cliente_nif)}`, 110, cy);
    cy += lineStep;
  }
  if (recibo.cliente_direccion) {
    doc.text(safeStr(recibo.cliente_direccion), 110, cy);
    cy += lineStep;
  }
  if (recibo.cliente_codigo_postal && recibo.cliente_ciudad) {
    doc.text(`${safeStr(recibo.cliente_codigo_postal)} ${safeStr(recibo.cliente_ciudad)}`, 110, cy);
    cy += lineStep;
  }
  if (recibo.cliente_provincia) {
    doc.text(safeStr(recibo.cliente_provincia), 110, cy);
    cy += lineStep;
  }

  /** Debajo de la columna más alta (emisor y cliente no deben solaparse con pago/estancia) */
  const colsBottom = Math.max(leftY, cy);
  const stayFrom = recibo.fecha_estancia_desde;
  const stayTo = recibo.fecha_estancia_hasta;
  const hasPaymentMeta = Boolean(recibo.fecha_pago || stayFrom || stayTo);

  let detailY = colsBottom + (hasPaymentMeta ? 12 : 6);
  doc.setFontSize(fontSize.normal);
  doc.setTextColor(...grayColor);
  const metaLineHeight = 6;

  if (recibo.fecha_pago) {
    doc.text(`Fecha del pago: ${fmtDateEs(recibo.fecha_pago)}`, 20, detailY);
    detailY += metaLineHeight;
  }
  if (stayFrom || stayTo) {
    let stayLine = 'Reserva / estancia: ';
    if (stayFrom && stayTo) {
      stayLine += `del ${fmtDateEs(stayFrom)} al ${fmtDateEs(stayTo)}`;
    } else if (stayFrom) {
      stayLine += `desde ${fmtDateEs(stayFrom)}`;
    } else {
      stayLine += `hasta ${fmtDateEs(stayTo)}`;
    }
    const stayLines = doc.splitTextToSize(stayLine, 172);
    doc.text(stayLines, 20, detailY);
    detailY += stayLines.length * metaLineHeight;
  }
  if (hasPaymentMeta) {
    detailY += 4;
  }

  const tableY = Math.max(148, detailY + 8);
  const separatorY = tableY - 5;
  doc.setDrawColor(...lightGrayColor);
  doc.line(20, separatorY, 190, separatorY);

  doc.setFillColor(...lightGrayColor);
  doc.rect(20, tableY, 170, 10, 'F');
  doc.setFontSize(fontSize.normal);
  doc.setTextColor(0, 0, 0);
  doc.text('Concepto', 22, tableY + 7);
  if (incluirIva) {
    doc.text('Base', 110, tableY + 7);
    doc.text('IVA', 140, tableY + 7);
    doc.text('Total', 170, tableY + 7);
  } else {
    doc.text('Importe percibido', 150, tableY + 7);
  }

  const dataY = tableY + 10;
  doc.rect(20, dataY, 170, 18, 'S');
  doc.text(safeStr(recibo.concepto), 22, dataY + 8);

  const total = safeNum(recibo.importe_total);
  if (incluirIva) {
    const base = safeNum(recibo.base_imponible);
    const iva = safeNum(recibo.iva_importe);
    doc.text(`${base.toFixed(2)} €`, 110, dataY + 8);
    doc.text(`${iva.toFixed(2)} €`, 140, dataY + 8);
    doc.text(`${total.toFixed(2)} €`, 170, dataY + 8);
  } else {
    doc.setFontSize(fontSize.subtitle);
    doc.setTextColor(...primaryColor);
    doc.text(`${total.toFixed(2)} €`, 165, dataY + 10);
  }

  let belowTableY = dataY + 14;
  if (recibo.descripcion) {
    doc.setFontSize(fontSize.small);
    doc.setTextColor(...grayColor);
    const descLines = doc.splitTextToSize(safeStr(recibo.descripcion), 166);
    doc.text(descLines, 22, belowTableY);
    belowTableY += descLines.length * 4 + 6;
  }

  const legalY = belowTableY + 20;
  doc.setFontSize(fontSize.small);
  doc.setTextColor(...grayColor);
  doc.text(
    'Documento emitido para acreditar un pago recibido. No sustituye a una factura fiscal completa para deducción',
    20,
    legalY
  );
  doc.text('de IVA en la medida en que no se emita factura conforme a la normativa.', 20, legalY + 5);
  if (!incluirIva) {
    doc.text('En este recibo no se detalla IVA: el importe refleja lo percibido del pagador.', 20, legalY + 14);
  } else {
    doc.text(
      'Desglose informativo de IVA sobre el importe percibido. Verifique con su asesor si requiere factura aparte.',
      20,
      legalY + 14
    );
  }

  if (recibo.forma_pago) {
    doc.setFontSize(fontSize.normal);
    doc.setTextColor(0, 0, 0);
    doc.text(`Forma de pago: ${safeStr(recibo.forma_pago)}`, 20, legalY + 26);
  }

  const footerY = 278;
  doc.setFontSize(fontSize.small);
  doc.setTextColor(...grayColor);
  doc.text('Gracias por su confianza', 20, footerY);
  doc.text('Recibo generado por Delfín Check-in', 20, footerY + 6);

  return doc;
}
