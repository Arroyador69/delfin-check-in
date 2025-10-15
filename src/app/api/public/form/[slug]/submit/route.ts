import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// CORS headers para permitir peticiones desde el formulario público
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID, X-Tenant-Name',
};

/**
 * Manejar preflight OPTIONS request
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

/**
 * API pública para enviar datos del formulario de un tenant
 * URL: /api/public/form/[slug]/submit
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const body = await req.json();
    
    // Debug: Log del payload recibido
    console.log('🔍 Endpoint /api/public/form/[slug]/submit recibido:');
    console.log('Slug:', slug);
    console.log('Body keys:', Object.keys(body));
    console.log('Body type:', typeof body);
    console.log('Body sample:', JSON.stringify(body, null, 2).slice(0, 500) + '...');

    // Verificar que el tenant existe y está activo
    const tenantResult = await sql`
      SELECT 
        t.id,
        t.name,
        t.email,
        t.config,
        t.status
      FROM tenants t
      WHERE t.id = ${slug}
        AND t.status = 'active'
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado o inactivo' },
        { status: 404, headers: corsHeaders }
      );
    }

    const tenant = tenantResult.rows[0];
    
    // Si el body contiene datos del MIR (contrato, viajeros), redirigir al endpoint correcto
    console.log('🔍 Verificando si son datos MIR:');
    console.log('Tiene contrato:', !!body.contrato);
    console.log('Tiene viajeros:', !!body.viajeros);
    console.log('Tiene tenantId:', !!body.tenantId);
    console.log('Tiene formData:', !!body.formData);
    
    // Detectar si es un formulario MIR (tiene contrato y viajeros) o un formulario simple
    const isMIRForm = body.contrato && body.viajeros;
    const isSimpleForm = body.tenantId && body.formData;
    
    if (isMIRForm) {
      console.log('✅ Datos MIR detectados, redirigiendo a /api/registro-flex');
      
      // Llamar directamente al endpoint interno en lugar de hacer fetch externo
      const { POST: registroFlexHandler } = await import('@/app/api/registro-flex/route');
      
      // Crear una nueva request interna para el endpoint de registro-flex
      const internalReq = new NextRequest(req.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-ID': tenant.id,
          'X-Tenant-Name': tenant.name,
          ...req.headers,
        },
        body: JSON.stringify(body),
      });

      try {
        const result = await registroFlexHandler(internalReq);
        
        if (!result.ok) {
          const errorText = await result.text();
          return NextResponse.json(
            { error: `Error en registro-flex: ${errorText}` },
            { status: result.status, headers: corsHeaders }
          );
        }

        const resultData = await result.json();
        
        // Log del envío para el tenant
        console.log(`📝 Formulario MIR enviado para tenant ${tenant.id}:`, {
          tenantName: tenant.name,
          timestamp: new Date().toISOString()
        });

        return NextResponse.json(resultData, { headers: corsHeaders });
        
      } catch (error) {
        console.error('❌ Error llamando al endpoint registro-flex:', error);
        return NextResponse.json(
          { error: `Error interno en registro-flex: ${error instanceof Error ? error.message : 'Error desconocido'}` },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Fallback: si no se detecta formato simple pero el payload podría ser MIR, intentarlo como MIR
    if (!isSimpleForm) {
      console.log('⚠️ Formato no reconocido explícitamente. Intentando reenviar como MIR (fallback).');
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com';
      const registroFlexUrl = `${baseUrl}/api/registro-flex`;
      const response = await fetch(registroFlexUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Tenant-ID': tenant.id,
          'X-Tenant-Name': tenant.name,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Fallback MIR falló:', errorText);
        return NextResponse.json(
          { error: `Error en registro-flex (fallback): ${errorText}` },
          { status: response.status, headers: corsHeaders }
        );
      }

      const result = await response.json();
      console.log('✅ Fallback MIR tuvo éxito');
      return NextResponse.json(result, { headers: corsHeaders });
    }

    // Si llegamos aquí, es un formulario simple (no MIR)
    console.log('❌ NO son datos MIR, procesando como formulario simple');
    
    // Si no es MIR ni formulario simple, es un error
    if (!isSimpleForm && !isMIRForm) {
      console.log('❌ Error: No se detectó ni formulario MIR ni formulario simple');
      console.log('Body recibido:', JSON.stringify(body, null, 2));
      return NextResponse.json(
        { error: 'Formato de datos no reconocido' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Procesar formulario simple
    const { tenantId, formData } = body;

    if (!tenantId || !formData) {
      console.log('❌ Error: Faltan tenantId o formData en formulario simple');
      return NextResponse.json(
        { error: 'Datos requeridos faltantes' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar datos requeridos para formularios simples
    if (!formData.name || !formData.email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Crear entrada en la tabla de formularios (si no existe, crear tabla)
    try {
      // Crear tabla de formularios si no existe
      await sql`
        CREATE TABLE IF NOT EXISTS form_submissions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          checkin DATE,
          checkout DATE,
          guests INTEGER,
          room_type VARCHAR(100),
          message TEXT,
          form_data JSONB NOT NULL,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // Crear índice para búsquedas por tenant
      await sql`
        CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id 
        ON form_submissions(tenant_id);
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_form_submissions_email 
        ON form_submissions(email);
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at 
        ON form_submissions(created_at);
      `;

    } catch (error) {
      console.log('Tabla form_submissions ya existe o error creándola:', error);
    }

    // Obtener información del cliente
    const clientIP = req.headers.get('x-forwarded-for') || 
                    req.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Insertar envío del formulario
    const result = await sql`
      INSERT INTO form_submissions (
        tenant_id,
        name,
        email,
        phone,
        checkin,
        checkout,
        guests,
        room_type,
        message,
        form_data,
        ip_address,
        user_agent
      ) VALUES (
        ${tenantId},
        ${formData.name},
        ${formData.email},
        ${formData.phone || null},
        ${formData.checkin || null},
        ${formData.checkout || null},
        ${formData.guests ? parseInt(formData.guests) : null},
        ${formData.room_type || null},
        ${formData.message || null},
        ${JSON.stringify(formData)},
        ${clientIP},
        ${userAgent}
      ) RETURNING id, created_at;
    `;

    const submission = result.rows[0];

    console.log(`📝 Formulario enviado para tenant ${tenantId}:`, {
      submissionId: submission.id,
      name: formData.name,
      email: formData.email,
      tenant: tenant.name
    });

    // TODO: Enviar notificación por email al tenant
    // TODO: Enviar email de confirmación al cliente
    // await sendFormNotificationEmail(tenant, formData);
    // await sendFormConfirmationEmail(formData.email, tenant);

    return NextResponse.json({
      success: true,
      message: 'Formulario enviado correctamente',
      submissionId: submission.id,
      submittedAt: submission.created_at
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error enviando formulario:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}
