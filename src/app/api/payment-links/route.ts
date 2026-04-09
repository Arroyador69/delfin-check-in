// =====================================================
// API: GESTIÓN DE ENLACES DE PAGO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

/** Columna guest_locale aún no aplicada en Neon: compatibilidad hasta ejecutar add-payment-links-guest-locale.sql */
function isMissingGuestLocaleColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const code = (err as { code?: string })?.code;
  if (msg.includes('guest_locale')) return true;
  if (code === '42703' && msg.includes('payment_links')) return true;
  return false;
}

// GET: Listar todos los enlaces de pago del tenant
export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant no identificado' },
        { status: 401 }
      );
    }

    const selectFull = () => sql`
      SELECT 
        id,
        link_code,
        link_name,
        resource_type,
        resource_id,
        check_in_date,
        check_out_date,
        total_price,
        base_price_per_night,
        cleaning_fee,
        expected_guests,
        expires_at,
        is_active,
        usage_count,
        max_uses,
        payment_completed,
        payment_completed_at,
        reservation_id,
        internal_notes,
        guest_locale,
        created_at,
        updated_at
      FROM payment_links
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const selectLegacy = () => sql`
      SELECT 
        id,
        link_code,
        link_name,
        resource_type,
        resource_id,
        check_in_date,
        check_out_date,
        total_price,
        base_price_per_night,
        cleaning_fee,
        expected_guests,
        expires_at,
        is_active,
        usage_count,
        max_uses,
        payment_completed,
        payment_completed_at,
        reservation_id,
        internal_notes,
        created_at,
        updated_at
      FROM payment_links
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    let links;
    try {
      links = await selectFull();
    } catch (e) {
      if (!isMissingGuestLocaleColumn(e)) throw e;
      console.warn(
        '[payment-links GET] Sin columna guest_locale; devolviendo enlaces con guest_locale por defecto es. Ejecuta database/add-payment-links-guest-locale.sql'
      );
      links = await selectLegacy();
      links.rows = links.rows.map((row) => ({ ...row, guest_locale: 'es' }));
    }

    return NextResponse.json({
      success: true,
      links: links.rows,
    });
  } catch (error: unknown) {
    console.error('Error listando enlaces de pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo enlace de pago
export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant no identificado' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const {
      link_name,
      resource_type,
      resource_id,
      check_in_date,
      check_out_date,
      total_price,
      base_price_per_night,
      cleaning_fee = 0,
      expected_guests = 2,
      expires_at,
      max_uses,
      internal_notes,
      guest_locale: guestLocaleRaw,
    } = data;

    const guest_locale = guestLocaleRaw === 'en' ? 'en' : 'es';

    // Los enlaces son siempre de un solo uso
    const finalMaxUses = 1;

    // Validar datos requeridos
    if (!resource_type || !resource_id || !check_in_date || !check_out_date || !total_price) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Validar tipo de recurso
    if (!['room', 'property'].includes(resource_type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de recurso inválido' },
        { status: 400 }
      );
    }

    // Validar fechas
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    if (checkOut <= checkIn) {
      return NextResponse.json(
        { success: false, error: 'La fecha de salida debe ser posterior a la de entrada' },
        { status: 400 }
      );
    }

    // Generar código único del enlace
    let linkCode: string = '';
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (codeExists && attempts < maxAttempts) {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      linkCode = `PL${year}${month}${random}`;

      const existingCode = await sql`
        SELECT link_code FROM payment_links WHERE link_code = ${linkCode} LIMIT 1
      `;

      codeExists = existingCode.rows.length > 0;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Error generando código único. Por favor, intenta de nuevo.' },
        { status: 500 }
      );
    }

    const insertWithLocale = () => sql`
      INSERT INTO payment_links (
        tenant_id,
        link_code,
        link_name,
        resource_type,
        resource_id,
        check_in_date,
        check_out_date,
        total_price,
        base_price_per_night,
        cleaning_fee,
        expected_guests,
        expires_at,
        max_uses,
        internal_notes,
        guest_locale,
        is_active,
        payment_completed
      ) VALUES (
        ${tenantId}::uuid,
        ${linkCode},
        ${link_name || null},
        ${resource_type},
        ${resource_id},
        ${check_in_date}::date,
        ${check_out_date}::date,
        ${total_price}::decimal,
        ${base_price_per_night || null}::decimal,
        ${cleaning_fee}::decimal,
        ${expected_guests}::integer,
        ${expires_at ? `${expires_at}::timestamp with time zone` : null},
        ${finalMaxUses}::integer,
        ${internal_notes || null},
        ${guest_locale},
        true,
        false
      )
      RETURNING *
    `;

    const insertLegacy = () => sql`
      INSERT INTO payment_links (
        tenant_id,
        link_code,
        link_name,
        resource_type,
        resource_id,
        check_in_date,
        check_out_date,
        total_price,
        base_price_per_night,
        cleaning_fee,
        expected_guests,
        expires_at,
        max_uses,
        internal_notes,
        is_active,
        payment_completed
      ) VALUES (
        ${tenantId}::uuid,
        ${linkCode},
        ${link_name || null},
        ${resource_type},
        ${resource_id},
        ${check_in_date}::date,
        ${check_out_date}::date,
        ${total_price}::decimal,
        ${base_price_per_night || null}::decimal,
        ${cleaning_fee}::decimal,
        ${expected_guests}::integer,
        ${expires_at ? `${expires_at}::timestamp with time zone` : null},
        ${finalMaxUses}::integer,
        ${internal_notes || null},
        true,
        false
      )
      RETURNING *
    `;

    let result;
    try {
      result = await insertWithLocale();
    } catch (e) {
      if (!isMissingGuestLocaleColumn(e)) throw e;
      console.warn(
        '[payment-links POST] Sin columna guest_locale: enlace creado; idioma huésped solo en la URL (no guardado en BD). Ejecuta database/add-payment-links-guest-locale.sql'
      );
      result = await insertLegacy();
    }

    const newLink = result.rows[0];
    const storedLocale = (newLink as { guest_locale?: string }).guest_locale;
    const localeForBook = storedLocale === 'en' || storedLocale === 'es' ? storedLocale : guest_locale;

    const baseUrl = process.env.NEXT_PUBLIC_BOOK_URL || 'https://book.delfincheckin.com';
    const langQs = localeForBook === 'en' ? '?lang=en' : '';
    const linkUrl = `${baseUrl}/pay/${newLink.link_code}${langQs}`;

    return NextResponse.json({
      success: true,
      link: {
        ...newLink,
        guest_locale: storedLocale ?? guest_locale,
        link_url: linkUrl,
      },
    });
  } catch (error: unknown) {
    console.error('Error creando enlace de pago:', error);
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
