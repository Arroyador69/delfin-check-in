import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import crypto from 'crypto';
import { logAudit } from '@/lib/audit';

type Row = {
  id: string;
  external_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  channel: string;
  total_price: number;
  guest_paid: number;
  platform_commission: number;
  net_income: number;
  currency: string;
};

function toCsv(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map(h => escape(r[h])).join(','));
  }
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const property = searchParams.get('property');
    const channelFilter = searchParams.get('channel');
    const roomsCsv = (searchParams.get('rooms') || '').trim();
    const channelsCsv = (searchParams.get('channels') || '').trim();
    const dateField = (searchParams.get('dateField') || 'check_out') === 'check_in' ? 'check_in' : 'check_out';
    const vatParam = parseFloat(searchParams.get('vat') || '21');
    const vat = isNaN(vatParam) ? 21 : Math.max(0, vatParam);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const correlationId = crypto.randomBytes(8).toString('hex');

    if (!from || !to) {
      return NextResponse.json({ error: 'Parámetros requeridos: from, to (YYYY-MM-DD)' }, { status: 400, headers: { 'x-correlation-id': correlationId } });
    }

    // Bitácora: petición recibida
    try {
      const payloadHash = crypto
        .createHash('sha256')
        .update(JSON.stringify({ from, to, property, vat, format }))
        .digest('hex');
      await logAudit({
        action: 'PARTE_CREATE',
        entityType: 'AEAT_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'received' }
      });
    } catch {}

    // Asegurar tabla (no rompe si ya existe)
    await sql`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        external_id VARCHAR(100) UNIQUE NOT NULL,
        room_id VARCHAR(50) NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        guest_email VARCHAR(255),
        guest_phone VARCHAR(50),
        guest_count INTEGER DEFAULT 1 CHECK (guest_count > 0),
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP NOT NULL,
        channel VARCHAR(50) DEFAULT 'manual',
        total_price DECIMAL(10,2) DEFAULT 0,
        guest_paid DECIMAL(10,2) DEFAULT 0,
        platform_commission DECIMAL(10,2) DEFAULT 0,
        net_income DECIMAL(10,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'EUR',
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Construcción dinámica con parámetros seguros
    const where: string[] = [];
    const params: any[] = [];
    where.push(`${dateField} >= $${params.length + 1}::date`); params.push(from);
    where.push(`${dateField} < ($${params.length + 1}::date + INTERVAL '1 day')`); params.push(to);
    where.push(`status != 'cancelled'`);
    if (property) { where.push(`room_id = $${params.length + 1}`); params.push(property); }
    const rooms = roomsCsv ? roomsCsv.split(',').map(s=>s.trim()).filter(Boolean) : [];
    if (rooms.length) { where.push(`room_id = ANY($${params.length + 1}::text[])`); params.push(rooms); }
    if (channelFilter) { where.push(`channel = $${params.length + 1}`); params.push(channelFilter); }
    const channels = channelsCsv ? channelsCsv.split(',').map(s=>s.trim()).filter(Boolean) : [];
    if (channels.length) { where.push(`channel = ANY($${params.length + 1}::text[])`); params.push(channels); }

    const sqlText = `
      SELECT id, external_id, room_id, check_in, check_out, channel,
             COALESCE(total_price,0)::float AS total_price,
             COALESCE(guest_paid,0)::float AS guest_paid,
             COALESCE(platform_commission,0)::float AS platform_commission,
             COALESCE(net_income,0)::float AS net_income,
             currency
      FROM reservations
      WHERE ${where.join(' AND ')}
      ORDER BY ${dateField} ASC
    `;
    const rows = (await sql.query<Row>(sqlText, params)).rows;

    const exportRows = rows.map(r => {
      const base = r.net_income != null ? Number(r.net_income) : Number(r.guest_paid) - Number(r.platform_commission);
      const cuota = Math.round((base * vat) as number) / 100;
      const total = base + cuota;
      return {
        fecha: new Date(r.check_out).toISOString().slice(0, 10),
        referencia: r.external_id || r.id,
        propiedad: r.room_id,
        reserva: r.id,
        base: base.toFixed(2),
        tipo_iva: vat,
        cuota_iva: cuota.toFixed(2),
        total: total.toFixed(2),
        metodo_pago: r.channel,
        comision_ota: Number(r.platform_commission).toFixed(2),
        moneda: r.currency || 'EUR',
      };
    });

    if (format === 'json') {
      try {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(exportRows)).digest('hex');
        await logAudit({
          action: 'VALIDATE_OK',
          entityType: 'AEAT_EXPORT',
          entityId: correlationId,
          payloadHash,
          meta: { stage: 'generated_json' }
        });
      } catch {}

      const totals = exportRows.reduce((acc, r) => {
        acc.base += Number(r.base);
        acc.cuota_iva += Number(r.cuota_iva);
        acc.total += Number(r.total);
        acc.comision_ota += Number(r.comision_ota);
        return acc;
      }, { base: 0, cuota_iva: 0, total: 0, comision_ota: 0 });

      const totalsByChannel = exportRows.reduce((acc: any, r) => {
        const ch = String(r.metodo_pago || '').toLowerCase();
        if (!acc[ch]) acc[ch] = { base: 0, cuota_iva: 0, total: 0, comision_ota: 0, count: 0 };
        acc[ch].base += Number(r.base);
        acc[ch].cuota_iva += Number(r.cuota_iva);
        acc[ch].total += Number(r.total);
        acc[ch].comision_ota += Number(r.comision_ota);
        acc[ch].count += 1;
        return acc;
      }, {} as Record<string, any>);

      return new NextResponse(
        JSON.stringify({ success: true, items: exportRows, totals, totalsByChannel, count: exportRows.length, dateField }),
        { status: 200, headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId } }
      );
    }

    const csv = toCsv(exportRows);
    const filename = `export_aeat_${from}_a_${to}.csv`;
    try {
      const payloadHash = crypto.createHash('sha256').update(csv).digest('hex');
      await logAudit({
        action: 'SES_SENT',
        entityType: 'AEAT_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'csv_generated' }
      });
    } catch {}
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'x-correlation-id': correlationId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const correlationId = crypto.randomBytes(8).toString('hex');
    try {
      const payloadHash = crypto.createHash('sha256').update(String(message)).digest('hex');
      await logAudit({
        action: 'ERROR',
        entityType: 'AEAT_EXPORT',
        entityId: correlationId,
        payloadHash,
        meta: { stage: 'internal_error' }
      });
    } catch {}
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: { 'x-correlation-id': correlationId } });
  }
}


