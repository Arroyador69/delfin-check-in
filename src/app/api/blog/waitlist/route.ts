import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendEmail } from '@/lib/email';

/**
 * ========================================
 * API: Waitlist con tracking de origen
 * ========================================
 * Permite registrar leads desde landing o artículos
 * y trackea el origen para analytics
 */

// Configuración CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://delfincheckin.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400', // 24 horas
};

// Manejar preflight requests (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source = 'landing' } = body;

    // Validaciones
    if (!email) {
      return NextResponse.json(
        { error: 'El email es obligatorio' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verificar si el email ya existe
    const existingUser = await sql`
      SELECT id, email, source, created_at 
      FROM waitlist 
      WHERE email = ${email}
      LIMIT 1
    `;

    if (existingUser.rows.length > 0) {
      // Email ya registrado, devolver info pero no error
      return NextResponse.json(
        {
          success: true,
          already_registered: true,
          message: 'Ya estás registrado en nuestra lista de espera',
          user: {
            email: existingUser.rows[0].email,
            source: existingUser.rows[0].source,
            registered_at: existingUser.rows[0].created_at
          }
        },
        { headers: corsHeaders }
      );
    }

    // Insertar nuevo usuario en la waitlist
    const result = await sql`
      INSERT INTO waitlist (email, name, source)
      VALUES (${email}, ${name || null}, ${source})
      RETURNING id, email, name, source, created_at
    `;

    console.log('✅ Nuevo usuario en waitlist:', {
      email,
      source,
      timestamp: new Date().toISOString()
    });

    // Si es desde un artículo, incrementar contador de conversiones
    if (source && source.startsWith('article:')) {
      const articleSlug = source.replace('article:', '');
      await sql`
        UPDATE blog_articles
        SET conversion_count = conversion_count + 1
        WHERE slug = ${articleSlug}
      `;
    }

    // Enviar email de confirmación automático
    try {
      const userName = name || 'propietario';
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #44c0ff 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🐬 Delfín Check-in</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">PMS Gratis para Propietarios</p>
            </div>
            <div class="content">
              <h2 style="color: #1d4ed8; margin-top: 0;">¡Bienvenido a la lista de espera, ${userName}!</h2>
              
              <p>Gracias por registrarte en Delfín Check-in. Estamos muy contentos de tenerte con nosotros.</p>
              
              <p style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <strong>🎉 Early Adopter:</strong> Como uno de los primeros en registrarte, tendrás acceso prioritario al PMS de manera completamente gratuita cuando lo lancemos. Serás uno de nuestros early adopters y podrás ayudarnos a mejorar el producto con tus comentarios.
              </p>
              
              <p><strong>En los próximos días, cuando todo esté listo, te enviaremos un email con las instrucciones para acceder al PMS.</strong></p>
              
              <p>Mientras tanto, esto es lo que puedes esperar:</p>
              
              <ul style="line-height: 2;">
                <li>✅ <strong>PMS completo gratis para siempre</strong> - Gestión de reservas, habitaciones y más</li>
                <li>✅ <strong>De propietarios, para propietarios</strong> - Hecho por personas que entienden tu negocio</li>
                <li>✅ <strong>Crea enlaces de pago personalizados</strong> - Define fechas, importe acordado y genera un enlace único de pago. Compártelo por WhatsApp o email y el huésped paga de forma segura</li>
                <li>✅ <strong>Microsite para reservas directas</strong> - Crea en minutos una página pública para tu alojamiento, comparte el enlace y recibe reservas directas con pagos directos</li>
                <li>✅ <strong>App móvil</strong> - Próximamente disponible para iOS y Android</li>
              </ul>
              
              <p style="background: #f0f9ff; padding: 16px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 20px 0;">
                <strong>💡 Nota importante:</strong> El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo (a excepción del envío al Ministerio del Interior) será gratis para siempre.
              </p>
              
              <p>Te notificaremos por email en cuanto el PMS esté listo para que puedas empezar a usarlo como early adopter.</p>
              
              <p>Si tienes alguna pregunta, no dudes en contactarnos en <a href="mailto:contacto@delfincheckin.com" style="color: #2563eb;">contacto@delfincheckin.com</a></p>
              
              <p style="margin-top: 30px;">¡Gracias por confiar en nosotros!</p>
              
              <p style="margin: 0;"><strong>El equipo de Delfín Check-in</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 Delfín Check-in · <a href="https://delfincheckin.com" style="color: #2563eb;">delfincheckin.com</a></p>
              <p style="font-size: 12px; margin-top: 10px;">Este email fue enviado porque te registraste en nuestra lista de espera.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: email,
        subject: '🐬 ¡Bienvenido a la lista de espera de Delfín Check-in!',
        html: emailHtml,
      });

      console.log('✅ Email de bienvenida enviado a:', email);
    } catch (emailError) {
      console.error('❌ Error enviando email de bienvenida:', emailError);
      // No fallar la request si el email falla, solo loguearlo
    }

    return NextResponse.json(
      {
        success: true,
        already_registered: false,
        message: '¡Gracias por registrarte! Revisa tu email para confirmar.',
        user: result.rows[0]
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('❌ Error registrando en waitlist:', error);
    
    // Error de unicidad (por si hay race condition)
    if (error.code === '23505') {
      return NextResponse.json(
        {
          success: true,
          already_registered: true,
          message: 'Ya estás registrado en nuestra lista de espera'
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al procesar tu registro. Inténtalo de nuevo.' 
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET: Obtener estadísticas de conversión por source (solo para superadmin)
 */
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación básica (puedes usar verifySuperAdmin aquí)
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');

    let query;
    if (source) {
      // Estadísticas de un source específico
      query = sql`
        SELECT 
          source,
          COUNT(*) as total_leads,
          COUNT(DISTINCT email) as unique_leads,
          MIN(created_at) as first_lead,
          MAX(created_at) as last_lead
        FROM waitlist
        WHERE source = ${source}
        GROUP BY source
      `;
    } else {
      // Estadísticas agrupadas por source
      query = sql`
        SELECT 
          source,
          COUNT(*) as total_leads,
          COUNT(DISTINCT email) as unique_leads,
          MIN(created_at) as first_lead,
          MAX(created_at) as last_lead
        FROM waitlist
        WHERE source IS NOT NULL
        GROUP BY source
        ORDER BY total_leads DESC
      `;
    }

    const result = await query;

    return NextResponse.json({
      success: true,
      stats: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo stats de waitlist:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
