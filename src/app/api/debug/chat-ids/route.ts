import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * 🔍 ENDPOINT PARA VER CHAT_ID DE TELEGRAM
 * 
 * Muestra todos los chat_id almacenados en la base de datos
 * para facilitar la configuración del bot de Telegram
 */

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Obteniendo chat_id de la base de datos...');

    // Obtener todos los tenants con sus chat_id
    const tenantsResult = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.telegram_chat_id,
        t.telegram_enabled
      FROM tenants t
      WHERE t.telegram_chat_id IS NOT NULL
      ORDER BY t.name
    `;

    // Obtener todos los usuarios con chat_id
    const usersResult = await sql`
      SELECT 
        tu.id,
        tu.email,
        tu.full_name,
        tu.role,
        tu.telegram_chat_id,
        t.name as tenant_name
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.telegram_chat_id IS NOT NULL
      ORDER BY t.name, tu.role
    `;

    // Crear HTML para mostrar los resultados
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔍 Chat IDs de Telegram - Delfín Check-in</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2563eb;
            text-align: center;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
        }
        .section h2 {
            color: #374151;
            margin-top: 0;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 10px;
        }
        .chat-id {
            background: #1f2937;
            color: #f9fafb;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 14px;
            margin: 5px 0;
            display: inline-block;
        }
        .info {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .copy-btn {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
            font-size: 12px;
        }
        .copy-btn:hover {
            background: #2563eb;
        }
        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .status.enabled {
            background: #dcfce7;
            color: #166534;
        }
        .status.disabled {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Chat IDs de Telegram</h1>
        
        <div class="info">
            <strong>📱 Instrucciones:</strong><br>
            1. Copia el chat_id que necesites<br>
            2. Úsalo para configurar el bot de Telegram<br>
            3. Los chat_id son únicos para cada usuario
        </div>

        <div class="section">
            <h2>🏢 Tenants (Propietarios)</h2>
            ${tenantsResult.rows.length > 0 ? 
              tenantsResult.rows.map(tenant => `
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: white;">
                  <strong>${tenant.name}</strong><br>
                  <small>Email: ${tenant.email}</small><br>
                  <span class="status ${tenant.telegram_enabled ? 'enabled' : 'disabled'}">
                    ${tenant.telegram_enabled ? '✅ Habilitado' : '❌ Deshabilitado'}
                  </span><br><br>
                  <strong>Chat ID:</strong><br>
                  <span class="chat-id" id="tenant-${tenant.id}">${tenant.telegram_chat_id}</span>
                  <button class="copy-btn" onclick="copyToClipboard('tenant-${tenant.id}')">📋 Copiar</button>
                </div>
              `).join('') : 
              '<p>No hay tenants con chat_id configurado</p>'
            }
        </div>

        <div class="section">
            <h2>👥 Usuarios (Staff)</h2>
            ${usersResult.rows.length > 0 ? 
              usersResult.rows.map(user => `
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: white;">
                  <strong>${user.full_name || user.email}</strong><br>
                  <small>Email: ${user.email}</small><br>
                  <small>Rol: ${user.role}</small><br>
                  <small>Tenant: ${user.tenant_name}</small><br><br>
                  <strong>Chat ID:</strong><br>
                  <span class="chat-id" id="user-${user.id}">${user.telegram_chat_id}</span>
                  <button class="copy-btn" onclick="copyToClipboard('user-${user.id}')">📋 Copiar</button>
                </div>
              `).join('') : 
              '<p>No hay usuarios con chat_id configurado</p>'
            }
        </div>

        <div class="info">
            <strong>💡 Nota:</strong> Si no ves los chat_id de tus padres, necesitas que envíen un mensaje al bot de Telegram primero.
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            
            navigator.clipboard.writeText(text).then(() => {
                const btn = element.nextElementSibling;
                const originalText = btn.textContent;
                btn.textContent = '✅ Copiado!';
                btn.style.background = '#10b981';
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '#3b82f6';
                }, 2000);
            }).catch(err => {
                console.error('Error copiando:', err);
                alert('Error al copiar. Chat ID: ' + text);
            });
        }
    </script>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (error) {
    console.error('❌ Error obteniendo chat_id:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>❌ Error - Chat IDs</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #fee2e2; }
        .error { background: white; padding: 20px; border-radius: 8px; border: 1px solid #dc2626; }
    </style>
</head>
<body>
    <div class="error">
        <h1>❌ Error</h1>
        <p>No se pudieron obtener los chat_id de la base de datos.</p>
        <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Error desconocido'}</p>
    </div>
</body>
</html>
    `;

    return new Response(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}

