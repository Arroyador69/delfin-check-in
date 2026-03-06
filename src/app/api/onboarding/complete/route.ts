import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { generateReferralCodeForTenant, associateTenantWithReferrer, getReferrerFromCookie } from '@/lib/referrals';
import { parseReferralCookie } from '@/lib/referral-tracking';

interface OnboardingData {
  dpaAceptado: boolean;
  nombreEmpresa: string;
  nifEmpresa: string;
  direccionEmpresa: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
  usuarioMir: string;
  contraseñaMir: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
}

export async function POST(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar el token JWT
    const payload = verifyToken(authToken);
    
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;
    const data: OnboardingData = await request.json();

    // Validar datos requeridos
    if (!data.dpaAceptado || !data.nombreEmpresa || !data.nifEmpresa || 
        !data.usuarioMir || !data.contraseñaMir || !data.codigoArrendador || 
        !data.codigoEstablecimiento) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener IP del cliente
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Iniciar transacción
    await sql`BEGIN`;

    try {
      // 1. Insertar/actualizar aceptación del DPA
      await sql`
        INSERT INTO dpa_aceptaciones (
          tenant_id,
          version_dpa,
          aceptado,
          fecha_aceptacion,
          ip_aceptacion,
          user_agent,
          datos_empresa_completados,
          configuracion_mir_completada,
          onboarding_completo
        ) VALUES (
          ${tenantId},
          '1.0',
          ${data.dpaAceptado},
          NOW(),
          ${ip},
          ${userAgent},
          true,
          true,
          true
        )
        ON CONFLICT (tenant_id, version_dpa) 
        DO UPDATE SET
          aceptado = ${data.dpaAceptado},
          fecha_aceptacion = NOW(),
          ip_aceptacion = ${ip},
          user_agent = ${userAgent},
          datos_empresa_completados = true,
          configuracion_mir_completada = true,
          onboarding_completo = true,
          updated_at = NOW()
      `;

      // 2. Insertar/actualizar datos de empresa
      // IMPORTANTE: empresa_config.tenant_id es VARCHAR(255), convertir UUID a string
      const tenantIdString = String(tenantId);
      await sql`
        INSERT INTO empresa_config (
          tenant_id,
          nombre_empresa,
          nif_empresa,
          direccion_empresa,
          codigo_postal,
          ciudad,
          provincia,
          pais,
          telefono,
          email,
          web
        ) VALUES (
          ${tenantIdString},
          ${data.nombreEmpresa},
          ${data.nifEmpresa},
          ${data.direccionEmpresa},
          ${data.codigoPostal},
          ${data.ciudad},
          ${data.provincia},
          ${data.pais},
          ${data.telefono},
          ${data.email},
          ${data.web || ''}
        )
        ON CONFLICT (tenant_id) 
        DO UPDATE SET
          nombre_empresa = ${data.nombreEmpresa},
          nif_empresa = ${data.nifEmpresa},
          direccion_empresa = ${data.direccionEmpresa},
          codigo_postal = ${data.codigoPostal},
          ciudad = ${data.ciudad},
          provincia = ${data.provincia},
          pais = ${data.pais},
          telefono = ${data.telefono},
          email = ${data.email},
          web = ${data.web || ''},
          updated_at = NOW()
      `;

      // 3. Insertar/actualizar configuración MIR
      await sql`
        INSERT INTO mir_configuraciones (
          propietario_id,
          usuario,
          contraseña,
          codigo_arrendador,
          codigo_establecimiento,
          base_url,
          aplicacion,
          simulacion,
          activo
        ) VALUES (
          ${tenantId},
          ${data.usuarioMir},
          ${data.contraseñaMir},
          ${data.codigoArrendador},
          ${data.codigoEstablecimiento},
          'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          'Delfin_Check_in',
          false,
          true
        )
        ON CONFLICT (propietario_id) 
        DO UPDATE SET
          usuario = ${data.usuarioMir},
          contraseña = ${data.contraseñaMir},
          codigo_arrendador = ${data.codigoArrendador},
          codigo_establecimiento = ${data.codigoEstablecimiento},
          updated_at = NOW()
      `;

      // 4. Crear/actualizar tenant si no existe
      await sql`
        INSERT INTO tenants (
          id,
          name,
          email,
          phone,
          address,
          city,
          country,
          created_at,
          updated_at
        ) VALUES (
          ${tenantId},
          ${data.nombreEmpresa},
          ${data.email},
          ${data.telefono},
          ${data.direccionEmpresa},
          ${data.ciudad},
          ${data.pais},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) 
        DO UPDATE SET
          name = ${data.nombreEmpresa},
          email = ${data.email},
          phone = ${data.telefono},
          address = ${data.direccionEmpresa},
          city = ${data.ciudad},
          country = ${data.pais},
          updated_at = NOW()
      `;

      // 5. Actualizar onboarding_status a 'completed'
      await sql`
        UPDATE tenants
        SET onboarding_status = 'completed', updated_at = NOW()
        WHERE id = ${tenantId}
      `;

      // 6. Generar código de referido para el tenant (si no existe)
      try {
        await generateReferralCodeForTenant(tenantId);
      } catch (refError) {
        console.warn('⚠️ Error generando código de referido:', refError);
        // No es crítico, continuar
      }

      // 7. Intentar asociar con referente desde cookie
      try {
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
          const cookieMatch = cookieHeader.match(/referral_ref=([^;]+)/);
          if (cookieMatch) {
            try {
              const cookieData = JSON.parse(decodeURIComponent(cookieMatch[1]));
              const referrerTenantId = await getReferrerFromCookie(cookieData);
              
              if (referrerTenantId && referrerTenantId !== tenantId) {
                // Obtener plan_type del tenant actual
                const tenantInfo = await sql`
                  SELECT plan_type 
                  FROM tenants 
                  WHERE id = ${tenantId}
                  LIMIT 1
                `;
                const planType = (tenantInfo.rows[0]?.plan_type || 'free') as 'free' | 'checkin' | 'standard' | 'pro';
                
                await associateTenantWithReferrer(
                  tenantId,
                  referrerTenantId,
                  cookieData.code,
                  planType
                );
                console.log('✅ Tenant asociado con referente desde cookie:', referrerTenantId);
              }
            } catch (cookieError) {
              console.warn('⚠️ Error parseando cookie de referido:', cookieError);
              // No es crítico, continuar
            }
          }
        }
      } catch (assocError) {
        console.warn('⚠️ Error asociando tenant con referente:', assocError);
        // No es crítico, continuar
      }

      // Confirmar transacción
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Onboarding completado exitosamente'
      });

    } catch (error) {
      // Revertir transacción en caso de error
      await sql`ROLLBACK`;
      throw error;
    }

  } catch (error) {
    console.error('Error completando onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}