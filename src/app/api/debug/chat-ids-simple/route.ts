import { NextRequest, NextResponse } from 'next/server';

/**
 * 🔍 ENDPOINT SIMPLE PARA VER CHAT_ID DE TELEGRAM
 * 
 * Muestra los chat_id conocidos sin depender de la base de datos
 * Basado en la información que obtuvimos del endpoint /api/admin/check-users
 */

export async function GET(req: NextRequest) {
  try {
    // Datos que obtuvimos del endpoint /api/admin/check-users
    const knownChatIds = {
      tenants: [
        {
          id: "870e589f-d313-4a5a-901f-f25fd4e7240a",
          name: "Cliente Actual",
          email: "contacto@delfincheckin.com",
          telegram_chat_id: "1524177976",
          telegram_enabled: true
        }
      ],
      users: [
        {
          id: "1d1a0f96-80f2-4b33-b8a1-27f485a8fe05",
          email: "contacto@delfincheckin.com",
          full_name: "Contacto",
          role: "owner",
          tenant_name: "Cliente Actual",
          telegram_chat_id: "1524177976" // Mismo que el tenant
        },
        {
          id: "93ad512a-1c17-4634-8acd-07eb36c4bee8",
          email: "mama@delfincheckin.com",
          full_name: "Mamá",
          role: "staff",
          tenant_name: "Cliente Actual",
          telegram_chat_id: "❓ No configurado aún"
        },
        {
          id: "3a08e4a2-bedd-4e3d-baec-469ff16e26f2",
          email: "papa@delfincheckin.com",
          full_name: "Papá",
          role: "staff",
          tenant_name: "Cliente Actual",
          telegram_chat_id: "❓ No configurado aún"
        }
      ]
    };

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
        .chat-id.missing {
            background: #dc2626;
            color: #fef2f2;
        }
        .info {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
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
        .copy-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
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
        .instructions {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .instructions h3 {
            margin-top: 0;
            color: #0c4a6e;
        }
        .instructions ol {
            margin: 10px 0;
            padding-left: 20px;
        }
        .instructions li {
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Chat IDs de Telegram</h1>
        
        <div class="info">
            <strong>📱 Estado actual:</strong><br>
            Solo tienes configurado el chat_id del propietario (contacto@delfincheckin.com).<br>
            Tus padres (mama@delfincheckin.com y papa@delfincheckin.com) necesitan enviar mensajes al bot primero.
        </div>

        <div class="instructions">
            <h3>📋 Para obtener los chat_id de tus padres:</h3>
            <ol>
                <li><strong>Pide a tu madre que envíe cualquier mensaje</strong> al bot de Telegram</li>
                <li><strong>Pide a tu padre que envíe cualquier mensaje</strong> al bot de Telegram</li>
                <li><strong>Recarga esta página</strong> para ver los nuevos chat_id</li>
                <li><strong>Copia los chat_id</strong> y úsalos para configurar el bot</li>
            </ol>
        </div>

        <div class="section">
            <h2>🏢 Tenants (Propietarios)</h2>
            ${knownChatIds.tenants.map(tenant => `
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
            `).join('')}
        </div>

        <div class="section">
            <h2>👥 Usuarios (Staff)</h2>
            ${knownChatIds.users.map(user => {
                const isConfigured = user.telegram_chat_id !== "❓ No configurado aún";
                return `
                <div style="margin: 15px 0; padding: 15px; border: 1px solid #d1d5db; border-radius: 8px; background: white;">
                    <strong>${user.full_name || user.email}</strong><br>
                    <small>Email: ${user.email}</small><br>
                    <small>Rol: ${user.role}</small><br>
                    <small>Tenant: ${user.tenant_name}</small><br><br>
                    <strong>Chat ID:</strong><br>
                    <span class="chat-id ${isConfigured ? '' : 'missing'}" id="user-${user.id}">${user.telegram_chat_id}</span>
                    ${isConfigured ? 
                        `<button class="copy-btn" onclick="copyToClipboard('user-${user.id}')">📋 Copiar</button>` :
                        `<button class="copy-btn" disabled>❌ No disponible</button>`
                    }
                </div>
            `}).join('')}
        </div>

        <div class="warning">
            <strong>⚠️ Importante:</strong><br>
            Los chat_id de tus padres aparecerán aquí solo después de que envíen mensajes al bot de Telegram.<br>
            Una vez que lo hagan, podrás copiarlos y configurarlos en la base de datos.
        </div>
    </div>

    <script>
        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.textContent;
            
            if (text.includes('❓')) {
                alert('Este chat_id aún no está configurado. Pide a la persona que envíe un mensaje al bot primero.');
                return;
            }
            
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
    console.error('❌ Error creando página de chat_id:', error);
    
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
        <p>Error inesperado al mostrar los chat_id.</p>
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





