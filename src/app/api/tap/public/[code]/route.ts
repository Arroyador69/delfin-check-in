import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTapSpaceByPublicCode, isTapWallActiveStatus } from '@/lib/tap-wall';

type Ctx = { params: Promise<{ code: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    const space = await getTapSpaceByPublicCode(code);
    if (!space) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    if (!isTapWallActiveStatus(space.account_status as string)) {
      return NextResponse.json(
        { error: 'Este enlace aún no está activo. El propietario debe completar la suscripción.' },
        { status: 403 }
      );
    }
    return NextResponse.json({
      success: true,
      space: {
        name: space.name,
        wifi_ssid: space.wifi_ssid,
        wifi_password: space.wifi_password,
        wifi_notes: space.wifi_notes,
        instructions_text: space.instructions_text,
        emergency_phone: space.emergency_phone,
        emergency_message: space.emergency_message,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { code } = await ctx.params;
    const space = await getTapSpaceByPublicCode(code);
    if (!space || !isTapWallActiveStatus(space.account_status as string)) {
      return NextResponse.json({ error: 'No disponible' }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || '').trim().slice(0, 2000);
    const contact = String(body.contact || '').trim().slice(0, 200);
    if (!message) {
      return NextResponse.json({ error: 'Escribe un mensaje' }, { status: 400 });
    }
    await sql`
      INSERT INTO tap_wall_emergencies (space_id, guest_message, guest_contact)
      VALUES (${String(space.id)}::uuid, ${message}, ${contact || null})
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
