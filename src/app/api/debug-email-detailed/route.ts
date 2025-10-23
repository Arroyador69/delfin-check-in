import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Verificar variables de entorno detalladamente
    const envCheck = {
      ZOHO_CLIENT_ID: {
        configured: !!process.env.ZOHO_CLIENT_ID,
        length: process.env.ZOHO_CLIENT_ID?.length || 0,
        value: process.env.ZOHO_CLIENT_ID ? `${process.env.ZOHO_CLIENT_ID.substring(0, 10)}...` : 'No configurado'
      },
      ZOHO_CLIENT_SECRET: {
        configured: !!process.env.ZOHO_CLIENT_SECRET,
        length: process.env.ZOHO_CLIENT_SECRET?.length || 0,
        value: process.env.ZOHO_CLIENT_SECRET ? `${process.env.ZOHO_CLIENT_SECRET.substring(0, 10)}...` : 'No configurado'
      },
      ZOHO_REFRESH_TOKEN: {
        configured: !!process.env.ZOHO_REFRESH_TOKEN,
        length: process.env.ZOHO_REFRESH_TOKEN?.length || 0,
        value: process.env.ZOHO_REFRESH_TOKEN ? `${process.env.ZOHO_REFRESH_TOKEN.substring(0, 10)}...` : 'No configurado'
      },
      ZOHO_FROM_EMAIL: process.env.ZOHO_FROM_EMAIL || 'No configurado',
      ZOHO_FROM_NAME: process.env.ZOHO_FROM_NAME || 'No configurado',
      SMTP_HOST: process.env.SMTP_HOST || 'No configurado',
      SMTP_PORT: process.env.SMTP_PORT || 'No configurado',
      SMTP_USER: process.env.SMTP_USER || 'No configurado',
      SMTP_PASSWORD: {
        configured: !!(process.env.SMTP_PASSWORD || process.env.SMTP_PASS),
        length: (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)?.length || 0,
        value: (process.env.SMTP_PASSWORD || process.env.SMTP_PASS) ? `${(process.env.SMTP_PASSWORD || process.env.SMTP_PASS).substring(0, 5)}...` : 'No configurado'
      }
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
          zohoTest = {
            success: true,
            hasAccessToken: !!data.access_token,
            accessTokenLength: data.access_token?.length || 0,
            expiresIn: data.expires_in
          };
        } else {
          const error = await response.text();
          zohoTest = {
            success: false,
            status: response.status,
            error: error
          };
        }
      } catch (error) {
        zohoTest = {
          success: false,
          error: error.message
        };
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
