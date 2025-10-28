import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Verificar variables de entorno
    const envCheck = {
      ZOHO_CLIENT_ID: process.env.ZOHO_CLIENT_ID ? '✅ Configurado' : '❌ No configurado',
      ZOHO_CLIENT_SECRET: process.env.ZOHO_CLIENT_SECRET ? '✅ Configurado' : '❌ No configurado',
      ZOHO_REFRESH_TOKEN: process.env.ZOHO_REFRESH_TOKEN ? '✅ Configurado' : '❌ No configurado',
      ZOHO_FROM_EMAIL: process.env.ZOHO_FROM_EMAIL || '❌ No configurado',
      ZOHO_FROM_NAME: process.env.ZOHO_FROM_NAME || '❌ No configurado',
      SMTP_HOST: process.env.SMTP_HOST || '❌ No configurado',
      SMTP_USER: process.env.SMTP_USER || '❌ No configurado',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS ? '✅ Configurado' : '❌ No configurado',
    };

    // Probar acceso a Zoho API
    let zohoTest = '❌ No probado';
    if (process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN) {
      try {
        const response = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            refresh_token: process.env.ZOHO_REFRESH_TOKEN,
            client_id: process.env.ZOHO_CLIENT_ID,
            client_secret: process.env.ZOHO_CLIENT_SECRET,
            grant_type: 'refresh_token'
          })
        });

        if (response.ok) {
          const data = await response.json();
          zohoTest = `✅ Access Token obtenido: ${data.access_token ? 'Sí' : 'No'}`;
        } else {
          const error = await response.text();
          zohoTest = `❌ Error: ${response.status} - ${error}`;
        }
      } catch (error) {
        zohoTest = `❌ Error de conexión: ${error.message}`;
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: envCheck,
      zohoTest,
      nodeVersion: process.version,
      platform: process.platform
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Error en diagnóstico', details: error.message },
      { status: 500 }
    );
  }
}
