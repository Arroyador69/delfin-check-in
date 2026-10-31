import { NextRequest, NextResponse } from 'next/server';
import { resolveMaxGuestsForTravelerForm } from '@/lib/form-max-guests';
import { publicCorsHeaders } from '@/lib/cors-allowlist';

const TENANT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: publicCorsHeaders(req.headers.get('origin')),
  });
}

/**
 * Devuelve max_guests para el formulario público (fallback si la URL no trae el parámetro).
 * GET ?tenant_id=&room_id=&property_id=
 */
export async function GET(req: NextRequest) {
  const corsHeaders = publicCorsHeaders(req.headers.get('origin'));
  try {
    const tenantId = req.nextUrl.searchParams.get('tenant_id')?.trim() || '';
    const roomId = req.nextUrl.searchParams.get('room_id')?.trim() || '';
    const propertyId = req.nextUrl.searchParams.get('property_id')?.trim() || '';

    if (!tenantId || !TENANT_ID_RE.test(tenantId)) {
      return NextResponse.json(
        { error: 'tenant_id inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    const maxGuests = await resolveMaxGuestsForTravelerForm(tenantId, {
      roomId: roomId || null,
      propertyId: propertyId || null,
    });

    return NextResponse.json({ max_guests: maxGuests }, { headers: corsHeaders });
  } catch (error) {
    console.error('[max-guests]', error);
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500, headers: corsHeaders }
    );
  }
}
