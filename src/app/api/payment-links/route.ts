// =====================================================
// API: GESTIÓN DE ENLACES DE PAGO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

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

    const links = await sql`
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

    return NextResponse.json({
      success: true,
      links: links.rows
    });
  } catch (error: any) {
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
      internal_notes
    } = data;

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
    let linkCode: string;
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 10;
    
    // Generar código único (intentar hasta encontrar uno disponible)
    while (codeExists && attempts < maxAttempts) {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      linkCode = `PL${year}${month}${random}`;
      
      // Verificar si el código ya existe
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

    // Crear el enlace (is_active explícito: evita NULL si la tabla no tiene DEFAULT en producción)
    const result = await sql`
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

    const newLink = result.rows[0];

    // Construir URL del enlace
    const baseUrl = process.env.NEXT_PUBLIC_BOOK_URL || 'https://book.delfincheckin.com';
    const linkUrl = `${baseUrl}/pay/${newLink.link_code}`;

    return NextResponse.json({
      success: true,
      link: {
        ...newLink,
        link_url: linkUrl
      }
    });
  } catch (error: any) {
    console.error('Error creando enlace de pago:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

