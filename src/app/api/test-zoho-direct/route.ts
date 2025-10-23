import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    console.log('🧪 Probando Zoho Mail directamente...');

    // Configuración de Zoho
    const ZOHO_CONFIG = {
      clientId: process.env.ZOHO_CLIENT_ID || '',
      clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
      refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
      fromEmail: process.env.ZOHO_FROM_EMAIL || 'noreply@delfincheckin.com',
      fromName: process.env.ZOHO_FROM_NAME || 'Delfin Check-in'
    };

    console.log('🔍 Configuración Zoho:', {
      hasClientId: !!ZOHO_CONFIG.clientId,
      hasClientSecret: !!ZOHO_CONFIG.clientSecret,
      hasRefreshToken: !!ZOHO_CONFIG.refreshToken,
      refreshTokenLength: ZOHO_CONFIG.refreshToken.length,
      fromEmail: ZOHO_CONFIG.fromEmail
    });

    // Paso 1: Obtener Access Token
    console.log('🔑 Obteniendo access token...');
    const tokenResponse = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: ZOHO_CONFIG.refreshToken,
        client_id: ZOHO_CONFIG.clientId,
        client_secret: ZOHO_CONFIG.clientSecret,
        grant_type: 'refresh_token'
      })
    });

    console.log('🔑 Token response status:', tokenResponse.status);
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('❌ Error obteniendo token:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Error obteniendo access token',
        details: errorText,
        status: tokenResponse.status
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Access token obtenido:', {
      hasAccessToken: !!tokenData.access_token,
      accessTokenLength: tokenData.access_token?.length,
      expiresIn: tokenData.expires_in
    });

    // Paso 2: Intentar enviar email
    console.log('📧 Intentando enviar email...');
    const emailPayload = {
      fromAddress: ZOHO_CONFIG.fromEmail,
      toAddress: to,
      subject: '🧪 Test Directo Zoho - Delfín Check-in',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🧪 Test Directo Zoho</h2>
          <p>Este es un test directo de Zoho Mail API.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Desde:</strong> ${ZOHO_CONFIG.fromEmail}</p>
          <p><strong>Hacia:</strong> ${to}</p>
        </div>
      `,
      textContent: `Test Directo Zoho - ${new Date().toLocaleString()}`
    };

    const emailResponse = await fetch('https://mail.zoho.eu/api/accounts/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('📧 Email response status:', emailResponse.status);
    
    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.log('❌ Error enviando email:', errorText);
      return NextResponse.json({
        success: false,
        error: 'Error enviando email',
        details: errorText,
        status: emailResponse.status
      });
    }

    const emailResult = await emailResponse.json();
    console.log('✅ Email enviado exitosamente:', emailResult);

    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente con Zoho',
      details: emailResult
    });

  } catch (error) {
    console.error('❌ Error en test-zoho-direct:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
