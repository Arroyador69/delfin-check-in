import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  getCleaningNotifyFrom,
  getCleaningNotifyTransporter,
} from '@/lib/cleaning-notify-email';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

    const configResult = await sql`
      SELECT cc.room_id, cc.cleaner_name, r.name AS room_name, t.name AS tenant_name
      FROM cleaning_config cc
      JOIN tenants t ON t.id = cc.tenant_id
      LEFT JOIN "Room" r ON r.id = cc.room_id
      WHERE cc.ical_token = ${token} AND cc.ical_enabled = true
      LIMIT 1
    `;

    if (configResult.rows.length === 0) {
      return new NextResponse(renderHTML('Error', '<p>Enlace no válido o desactivado.</p>'), {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const config = configResult.rows[0];
    const roomName = config.room_name || `Habitación ${config.room_id}`;

    const existingNotes = await sql`
      SELECT note, author_type, created_at
      FROM cleaning_notes
      WHERE room_id = ${config.room_id}
        AND cleaning_date = ${date}::date
      ORDER BY created_at DESC
      LIMIT 10
    `;

    let notesHtml = '';
    if (existingNotes.rows.length > 0) {
      notesHtml = '<div style="margin-bottom:24px"><h3 style="margin-bottom:8px">Notas del día</h3>';
      for (const n of existingNotes.rows) {
        const who = n.author_type === 'owner' ? '👤 Alojamiento' : '🧹 Limpieza';
        const time = new Date(n.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        notesHtml += `<div style="background:#f9fafb;padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid ${n.author_type === 'owner' ? '#3b82f6' : '#10b981'}">
          <strong>${who}</strong> <span style="color:#6b7280;font-size:13px">${time}</span>
          <p style="margin:4px 0 0">${escapeHtml(n.note)}</p>
        </div>`;
      }
      notesHtml += '</div>';
    }

    const html = renderHTML(
      `${roomName} - ${date}`,
      `
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:48px;margin-bottom:8px">🧹</div>
        <h1 style="font-size:24px;color:#1f2937;margin:0">${escapeHtml(roomName)}</h1>
        <p style="color:#6b7280;margin:4px 0 0">Limpieza del ${formatDate(date)}</p>
        <p style="color:#9ca3af;font-size:13px">${escapeHtml(config.tenant_name)}</p>
      </div>
      ${notesHtml}
      <form method="POST" action="" style="margin-top:16px">
        <input type="hidden" name="date" value="${date}" />
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
    console.error('[cleaning/public/note] GET error:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const configResult = await sql`
      SELECT cc.tenant_id, cc.room_id, cc.cleaner_name, r.name AS room_name,
             t.name AS tenant_name, t.email AS tenant_email
      FROM cleaning_config cc
      JOIN tenants t ON t.id = cc.tenant_id
      LEFT JOIN "Room" r ON r.id = cc.room_id
      WHERE cc.ical_token = ${token} AND cc.ical_enabled = true
      LIMIT 1
    `;

    if (configResult.rows.length === 0) {
      return new NextResponse('Enlace no válido', { status: 404 });
    }

    const config = configResult.rows[0];
    const roomName = config.room_name || `Habitación ${config.room_id}`;

    let note: string;
    let date: string;

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      note = (formData.get('note') as string) || '';
      date = (formData.get('date') as string) || new Date().toISOString().slice(0, 10);
    } else {
      const body = await req.json();
      note = body.note || '';
      date = body.date || new Date().toISOString().slice(0, 10);
    }

    if (!note.trim() || note.length > 2000) {
      return new NextResponse('Nota vacía o demasiado larga', { status: 400 });
    }

    await sql`
      INSERT INTO cleaning_notes (tenant_id, room_id, cleaning_date, author_type, note)
      VALUES (${config.tenant_id}::uuid, ${config.room_id}, ${date}::date, 'cleaner', ${note.trim()})
    `;

    if (config.tenant_email) {
      const transport = getCleaningNotifyTransporter();
      if (!transport) {
        console.warn(
          '[cleaning/public/note] SMTP no configurado (SMTP_HOST / SMTP_USER / SMTP_PASS o SMTP_PASSWORD); no se envía correo al alojamiento'
        );
      } else {
      try {
        await transport.sendMail({
          from: getCleaningNotifyFrom(),
          to: config.tenant_email,
          subject: `🧹 Nueva nota de limpieza - ${roomName}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
              <h2 style="color:#1f2937">🧹 Nueva nota de limpieza</h2>
              <div style="background:#f0fdf4;padding:16px;border-radius:12px;border-left:4px solid #10b981;margin:16px 0">
                <p style="margin:0 0 4px"><strong>${escapeHtml(roomName)}</strong> · ${formatDate(date)}</p>
                ${config.cleaner_name ? `<p style="margin:0 0 8px;color:#6b7280;font-size:14px">De: ${escapeHtml(config.cleaner_name)}</p>` : ''}
                <p style="margin:0;font-size:16px">${escapeHtml(note.trim())}</p>
              </div>
              <p style="color:#9ca3af;font-size:13px;margin-top:16px">
                El alojamiento puede verla en su panel de Delfín Check-in.
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.warn('[cleaning/public/note] Email failed:', (emailErr as Error).message);
      }
      }
    }

    const redirectUrl = new URL(req.url);
    redirectUrl.search = `?date=${date}&sent=1`;
    const successHtml = renderHTML(
      'Nota enviada',
      `<div style="text-align:center;padding:40px 0">
        <div style="font-size:64px;margin-bottom:16px">✅</div>
        <h2 style="color:#1f2937;margin:0 0 8px">Nota enviada</h2>
        <p style="color:#6b7280">Tu nota para <strong>${escapeHtml(roomName)}</strong> (${formatDate(date)}) se ha enviado correctamente.</p>
        <a href="${redirectUrl.pathname}?date=${date}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:linear-gradient(to right,#3b82f6,#8b5cf6);color:white;text-decoration:none;border-radius:12px;font-weight:600">
          Volver
        </a>
      </div>`
    );

    return new NextResponse(successHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[cleaning/public/note] POST error:', error);
    return new NextResponse('Error interno', { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
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
