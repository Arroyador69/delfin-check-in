import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

/**
 * ========================================
 * ENDPOINTS DE WAITLIST
 * ========================================
 * Maneja la lista de espera de usuarios interesados en el PMS
 */

const WaitlistSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

// Headers CORS comunes
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * POST - Agregar email a la waitlist
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const parsed = WaitlistSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: parsed.error.flatten()
        },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    const { email, name, source, notes } = parsed.data;
    
    // Verificar si el email ya está en la waitlist
    const existing = await sql`
      SELECT id, activated_at FROM waitlist WHERE email = ${email} LIMIT 1
    `;
    
    if (existing.rows.length > 0) {
      const entry = existing.rows[0];
      
      // Si ya está activado, informar
      if (entry.activated_at) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Este email ya tiene una cuenta activa',
            alreadyActivated: true
          },
          { 
            status: 400,
            headers: corsHeaders
          }
        );
      }
      
      // Si ya está en waitlist pero no activado, informar
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya está en la lista de espera',
          alreadyInWaitlist: true
        },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    // Verificar si el email ya tiene un tenant activo
    const existingTenant = await sql`
      SELECT id FROM tenants WHERE email = ${email} LIMIT 1
    `;
    
    if (existingTenant.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya tiene una cuenta activa',
          alreadyActivated: true
        },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    // Agregar a la waitlist
    const result = await sql`
      INSERT INTO waitlist (email, name, source, notes)
      VALUES (${email}, ${name || null}, ${source || null}, ${notes || null})
      RETURNING id, email, created_at
    `;
    
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
      
      const emailText = `
¡Bienvenido a la lista de espera, ${userName}!

Gracias por registrarte en Delfín Check-in. Estamos muy contentos de tenerte con nosotros.

🎉 Early Adopter: Como uno de los primeros en registrarte, tendrás acceso prioritario al PMS de manera completamente gratuita cuando lo lancemos. Serás uno de nuestros early adopters y podrás ayudarnos a mejorar el producto con tus comentarios.

En los próximos días, cuando todo esté listo, te enviaremos un email con las instrucciones para acceder al PMS.

Mientras tanto, esto es lo que puedes esperar:

✅ PMS completo gratis para siempre - Gestión de reservas, habitaciones y más
✅ De propietarios, para propietarios - Hecho por personas que entienden tu negocio
✅ Crea enlaces de pago personalizados - Define fechas, importe acordado y genera un enlace único de pago. Compártelo por WhatsApp o email y el huésped paga de forma segura
✅ Microsite para reservas directas - Crea en minutos una página pública para tu alojamiento, comparte el enlace y recibe reservas directas con pagos directos
✅ App móvil - Próximamente disponible para iOS y Android

Nota importante: El módulo de check-in digital (envío al Ministerio del Interior) tendrá un coste de 2€/mes (+ IVA 21%), pero el PMS completo (a excepción del envío al Ministerio del Interior) será gratis para siempre.

Te notificaremos por email en cuanto el PMS esté listo para que puedas empezar a usarlo como early adopter.

Si tienes alguna pregunta, no dudes en contactarnos en contacto@delfincheckin.com

¡Gracias por confiar en nosotros!

El equipo de Delfín Check-in

© 2026 Delfín Check-in · delfincheckin.com
      `;
      
      await sendEmail({
        to: email,
        subject: '🎉 ¡Bienvenido a Delfín Check-in! - Early Adopter - Acceso gratuito próximamente',
        html: emailHtml,
        text: emailText
      });
      
      console.log(`✅ Email de confirmación enviado a ${email}`);
    } catch (emailError) {
      console.error('⚠️ Error enviando email de confirmación (no crítico):', emailError);
      // No fallamos la operación si el email falla
    }
    
    return NextResponse.json({
      success: true,
      message: 'Te hemos agregado a la lista de espera. Te notificaremos cuando el PMS esté disponible.',
      data: result.rows[0]
    }, {
      headers: corsHeaders
    });
    
  } catch (error: any) {
    console.error('Error agregando a waitlist:', error);
    
    // Si es error de constraint único, el email ya existe
    if (error.code === '23505') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este email ya está en la lista de espera'
        },
        { 
          status: 400,
          headers: corsHeaders
        }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al agregar a la lista de espera'
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

/**
 * GET - Obtener estadísticas de waitlist (solo para admin interno)
 * Nota: En producción, esto debería estar protegido con autenticación
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener estadísticas
    const stats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activated_at IS NULL) as pending,
        COUNT(*) FILTER (WHERE activated_at IS NOT NULL) as activated
      FROM waitlist
    `;
    
    // Obtener últimos registros (solo si se solicita)
    const url = new URL(req.url);
    const includeEntries = url.searchParams.get('include_entries') === 'true';
    
    let entries = null;
    if (includeEntries) {
      const result = await sql`
        SELECT id, email, name, created_at, activated_at, tenant_id, source
        FROM waitlist
        ORDER BY created_at DESC
        LIMIT 100
      `;
      entries = result.rows;
    }
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0],
      entries: entries
    }, {
      headers: corsHeaders
    });
    
  } catch (error) {
    console.error('Error obteniendo waitlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener la lista de espera'
      },
      { 
        status: 500,
        headers: corsHeaders
      }
    );
  }
}

