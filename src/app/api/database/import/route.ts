import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rooms = Array.isArray(body.rooms) ? body.rooms : [];
    const reservations = Array.isArray(body.reservations) ? body.reservations : [];
    const guests = Array.isArray(body.guests) ? body.guests : [];
    const guestRegs = Array.isArray(body.guest_registrations) ? body.guest_registrations : [];
    const msgTemplates = Array.isArray(body.message_templates) ? body.message_templates : [];

    // Insertar con UPSERTs simples cuando sea posible
    for (const r of rooms) {
      await sql`
        INSERT INTO "Room" (id, name, "basePrice", description, capacity, amenities)
        VALUES (${r.id}, ${r.name}, ${r.base_price || 0}, ${r.description || ''}, ${r.capacity || 2}, ${r.amenities || []})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          base_price = EXCLUDED.base_price,
          description = EXCLUDED.description,
          capacity = EXCLUDED.capacity,
          amenities = EXCLUDED.amenities;
      `;
    }

    for (const rv of reservations) {
      await sql`
        INSERT INTO reservations (
          id, external_id, room_id, guest_name, guest_email, guest_phone, guest_count,
          check_in, check_out, channel, total_price, guest_paid, platform_commission, net_income, currency, status
        ) VALUES (
          ${rv.id || null}, ${rv.external_id}, ${rv.room_id}, ${rv.guest_name}, ${rv.guest_email || ''}, ${rv.guest_phone || ''}, ${rv.guest_count || 1},
          ${rv.check_in}::timestamp, ${rv.check_out}::timestamp, ${rv.channel || 'manual'}, ${rv.total_price || 0},
          ${rv.guest_paid || 0}, ${rv.platform_commission || 0}, ${rv.net_income || 0}, ${rv.currency || 'EUR'}, ${rv.status || 'confirmed'}
        )
        ON CONFLICT (external_id) DO UPDATE SET
          room_id = EXCLUDED.room_id,
          guest_name = EXCLUDED.guest_name,
          guest_email = EXCLUDED.guest_email,
          guest_phone = EXCLUDED.guest_phone,
          guest_count = EXCLUDED.guest_count,
          check_in = EXCLUDED.check_in,
          check_out = EXCLUDED.check_out,
          channel = EXCLUDED.channel,
          total_price = EXCLUDED.total_price,
          guest_paid = EXCLUDED.guest_paid,
          platform_commission = EXCLUDED.platform_commission,
          net_income = EXCLUDED.net_income,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status;
      `;
    }

    for (const g of guests) {
      await sql`
        INSERT INTO guests (id, reservation_id, name, document_type, document_number, birth_date, country, signature_url, accepts_rules)
        VALUES (${g.id || null}, ${g.reservation_id || null}, ${g.name}, ${g.document_type}, ${g.document_number}, ${g.birth_date}, ${g.country}, ${g.signature_url || null}, ${g.accepts_rules || false})
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    for (const gr of guestRegs) {
      await sql`
        INSERT INTO guest_registrations (id, reserva_ref, fecha_entrada, fecha_salida, data)
        VALUES (${gr.id || null}, ${gr.reserva_ref || null}, ${gr.fecha_entrada}, ${gr.fecha_salida}, ${JSON.stringify(gr.data || {})}::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    for (const mt of msgTemplates) {
      await sql`
        INSERT INTO message_templates (id, name, trigger_type, channel, language, template_content, variables, is_active)
        VALUES (${mt.id || null}, ${mt.name}, ${mt.trigger_type}, ${mt.channel}, ${mt.language}, ${mt.template_content}, ${JSON.stringify(mt.variables || [])}::jsonb, ${!!mt.is_active})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          trigger_type = EXCLUDED.trigger_type,
          channel = EXCLUDED.channel,
          language = EXCLUDED.language,
          template_content = EXCLUDED.template_content,
          variables = EXCLUDED.variables,
          is_active = EXCLUDED.is_active;
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'database-import-failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}


