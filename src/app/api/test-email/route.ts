/**
 * 🧪 API PARA PROBAR ENVÍO DE EMAILS EN PRODUCCIÓN
 * 
 * Este endpoint permite probar la configuración de email
 * sin necesidad de usar el flujo completo de recuperación.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendRecoveryEmail } from '@/lib/email';
import { checkEmailConfig } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    // Solo permitir en desarrollo o con token de admin
    const authHeader = req.headers.get('authorization');
    const isAdmin = authHeader === `Bearer ${process.env.ADMIN_TEST_TOKEN}`;
    
    if (process.env.NODE_ENV === 'production' && !isAdmin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { email, testType = 'recovery' } = await req.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email requerido' },
        { status: 400 }
      );
    }

    // Verificar configuración de email
    const configCheck = checkEmailConfig();
    console.log('🔍 Estado de configuración de email:', configCheck);

    if (testType === 'recovery') {
      // Probar email de recuperación
      const result = await sendRecoveryEmail({
        to: email,
        userName: 'Usuario de Prueba',
        recoveryCode: '123456',
        tenantName: 'Delfín Check-in'
      });

      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        configStatus: configCheck,
        message: result.success 
          ? 'Email de prueba enviado exitosamente' 
          : 'Error enviando email de prueba'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Tipo de prueba no soportado'
    });

  } catch (error) {
    console.error('❌ Error en test-email:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Endpoint para verificar configuración sin enviar emails
  const configCheck = checkEmailConfig();
  
  return NextResponse.json({
    configured: configCheck.configured,
    issues: configCheck.issues,
    availableServices: {
      zoho: !!(process.env.ZOHO_REFRESH_TOKEN || process.env.ZOHO_MAIL_API_KEY),
      smtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD),
      resend: !!process.env.RESEND_API_KEY
    }
  });
}
