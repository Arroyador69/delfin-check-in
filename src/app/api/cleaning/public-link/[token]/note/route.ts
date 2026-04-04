import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  getCleaningNotifyFrom,
  getCleaningNotifyTransporter,
} from '@/lib/cleaning-notify-email';

async function resolveLinkAndRoom(
  token: string,
  roomId: string
): Promise<{
  tenant_id: string;
  room_id: string;
  room_name: string;
  tenant_name: string;
  tenant_email: string | null;
  cleaner_name: string | null;
} | null> {
  const link = await sql`
    SELECT id, tenant_id FROM cleaning_public_links WHERE public_token = ${token} LIMIT 1
  `;
  if (link.rows.length === 0) return null;

  const row = link.rows[0] as { id: string; tenant_id: string };
  const member = await sql`
    SELECT 1 FROM cleaning_link_rooms
    WHERE link_id = ${row.id}::uuid AND tenant_id = ${row.tenant_id}::uuid AND room_id = ${roomId}
    LIMIT 1
  `;
  if (member.rows.length === 0) return null;

  const cfg = await sql`
    SELECT cc.cleaner_name, r.name AS room_name, t.name AS tenant_name, t.email AS tenant_email
    FROM cleaning_config cc
    INNER JOIN tenants t ON t.id = cc.tenant_id
    LEFT JOIN "Room" r ON r.id::text = cc.room_id
    WHERE cc.tenant_id = ${row.tenant_id}::uuid AND cc.room_id = ${roomId}
    LIMIT 1
  `;

  if (cfg.rows.length > 0) {
    const c = cfg.rows[0] as Record<string, unknown>;
    return {
      tenant_id: row.tenant_id,
      room_id: roomId,
      room_name: (c.room_name as string) || `Habitación ${roomId}`,
      tenant_name: c.tenant_name as string,
      tenant_email: (c.tenant_email as string) || null,
      cleaner_name: (c.cleaner_name as string) || null,
    };
  }

  const fallback = await sql`
    SELECT r.name AS room_name, t.name AS tenant_name, t.email AS tenant_email
    FROM "Room" r
    CROSS JOIN tenants t
    WHERE t.id = ${row.tenant_id}::uuid
      AND r."lodgingId" = (SELECT lodging_id FROM tenants WHERE id = ${row.tenant_id}::uuid)
      AND r.id::text = ${roomId}
    LIMIT 1
  `;
  if (fallback.rows.length === 0) return null;
  const f = fallback.rows[0] as Record<string, unknown>;
  return {
    tenant_id: row.tenant_id,
    room_id: roomId,
    room_name: (f.room_name as string) || `Habitación ${roomId}`,
    tenant_name: f.tenant_name as string,
    tenant_email: (f.tenant_email as string) || null,
    cleaner_name: null,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('room_id') || '';
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    if (!roomId) {
      return new NextResponse(renderHTML('Error', '<p>Falta habitación.</p>'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const resolved = await resolveLinkAndRoom(token, roomId);
    if (!resolved) {
      return new NextResponse(renderHTML('Error', '<p>Enlace no válido o habitación no incluida.</p>'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const existingNotes = await sql`
      SELECT note, author_type, created_at
      FROM cleaning_notes
      WHERE room_id = ${resolved.room_id}
        AND tenant_id = ${resolved.tenant_id}::uuid
        AND cleaning_date = ${date}::date
      ORDER BY created_at DESC
      LIMIT 10
    `;

    let notesHtml = '';
    if (existingNotes.rows.length > 0) {
      notesHtml = '<div style="margin-bottom:24px"><h3 style="margin-bottom:8px">Notas del día</h3>';
      for (const n of existingNotes.rows) {
        const who = n.author_type === 'owner' ? '👤 Alojamiento' : '🧹 Limpieza';
        const time = new Date(n.created_at as string).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });
        notesHtml += `<div style="background:#f9fafb;padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid ${n.author_type === 'owner' ? '#3b82f6' : '#10b981'}">
          <strong>${who}</strong> <span style="color:#6b7280;font-size:13px">${time}</span>
          <p style="margin:4px 0 0">${escapeHtml(n.note as string)}</p>
        </div>`;
      }
      notesHtml += '</div>';
    }

    const html = renderHTML(
      `${resolved.room_name} - ${date}`,
      `
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:8px">🧹</div>
        <h1 style="font-size:24px;color:#1f2937;margin:0">${escapeHtml(resolved.room_name)}</h1>
        <p style="color:#6b7280;margin:4px 0 0">Limpieza del ${formatDate(date)}</p>
        <p style="color:#9ca3af;font-size:13px">${escapeHtml(resolved.tenant_name)}</p>
      </div>
      ${notesHtml}
      <form method="POST" action="" style="margin-top:16px">
        <input type="hidden" name="date" value="${date}" />
        <input type="hidden" name="room_id" value="${escapeHtml(roomId)}" />
        <label style="display:block;font-weight:600;margin-bottom:8px;color:#374151">Dejar una nota</label>
        <textarea name="note" required maxlength="2000" rows="4"
          style="width:100%;padding:12px;border:2px solid #d1d5db;border-radius:12px;font-size:16px;resize:vertical;font-family:inherit"
          placeholder="Ej: Falta papel higiénico, grifo gotea..."></textarea>
        <button type="submit"
          style="margin-top:12px;width:100%;padding:14px;background:linear-gradient(to right,#3b82f6,#8b5cf6);color:white;border:none;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer">
          Enviar nota
        </button>
      </form>
      `
    );

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[cleaning/public-link/note] GET error:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    let note: string;
    let date: string;
    let roomId: string;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      note = (formData.get('note') as string) || '';
      date = (formData.get('date') as string) || new Date().toISOString().slice(0, 10);
      roomId = (formData.get('room_id') as string) || '';
    } else {
      const body = await req.json();
      note = body.note || '';
      date = body.date || new Date().toISOString().slice(0, 10);
      roomId = body.room_id || '';
    }

    if (!roomId) {
      return new NextResponse('Falta habitación', { status: 400 });
    }

    const resolved = await resolveLinkAndRoom(token, roomId);
    if (!resolved) {
      return new NextResponse('Enlace no válido', { status: 404 });
    }

    if (!note.trim() || note.length > 2000) {
      return new NextResponse('Nota vacía o demasiado larga', { status: 400 });
    }

    await sql`
      INSERT INTO cleaning_notes (tenant_id, room_id, cleaning_date, author_type, note)
      VALUES (${resolved.tenant_id}::uuid, ${resolved.room_id}, ${date}::date, 'cleaner', ${note.trim()})
    `;

    if (resolved.tenant_email) {
      const transport = getCleaningNotifyTransporter();
      if (!transport) {
        console.warn(
          '[cleaning/public-link/note] SMTP no configurado (SMTP_HOST / SMTP_USER / SMTP_PASS o SMTP_PASSWORD); no se envía correo al alojamiento'
        );
      } else {
      try {
        await transport.sendMail({
          from: getCleaningNotifyFrom(),
          to: resolved.tenant_email,
          subject: `🧹 Nueva nota de limpieza - ${resolved.room_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="color:#1f2937">🧹 Nueva nota de limpieza</h2>
              <div style="background:#f0fdf4;padding:16px;border-radius:12px;border-left:4px solid #10b981;margin:16px 0">
                <p style="margin:0 0 4px"><strong>${escapeHtml(resolved.room_name)}</strong> · ${formatDate(date)}</p>
                ${resolved.cleaner_name ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px">De: ${escapeHtml(resolved.cleaner_name)}</p>` : ''}
                <p style="margin:0;font-size:16px">${escapeHtml(note.trim())}</p>
              </div>
              <p style="color:#9ca3af;font-size:13px;margin-top:16px">
                El alojamiento puede verla en su panel de Delfín Check-in.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn('[cleaning/public-link/note] Email failed:', (emailErr as Error).message);
      }
      }
    }

    const redirectUrl = new URL(req.url);
    redirectUrl.search = `?room_id=${encodeURIComponent(roomId)}&date=${date}&sent=1`;
    const successHtml = renderHTML(
      'Nota enviada',
      `<div style="text-align:center;padding:40px 0">
        <div style="font-size:64px;margin-bottom:16px">✅</div>
        <h2 style="color:#1f2937;margin:0 0 8px">Nota enviada</h2>
        <p style="color:#6b7280">Tu nota para <strong>${escapeHtml(resolved.room_name)}</strong> (${formatDate(date)}) se ha enviado correctamente.</p>
        <a href="${redirectUrl.pathname}?room_id=${encodeURIComponent(roomId)}&date=${date}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:linear-gradient(to right,#3b82f6,#8b5cf6);color:white;text-decoration:none;border-radius:12px;font-weight:600">
          Volver
        </a>
      </div>`
    );

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[cleaning/public-link/note] POST error:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderHTML(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} - Delfín Check-in</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           margin: 0; padding: 16px; background: linear-gradient(135deg, #eff6ff, #f5f3ff);
           min-height: 100vh; }
    .card { max-width: 520px; margin: 24px auto; background: white; border-radius: 16px;
            padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  </style>
</head>
<body>
  <div class="card">${body}</div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:24px">Delfín Check-in 🐬</p>
</body>
</html>`;
}
