import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * 🔍 API DE DEBUG PARA LOGIN
 * 
 * Esta API nos ayuda a debuggear exactamente qué está pasando con el login
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log(`🔍 DEBUG LOGIN - Email recibido: ${email}`);
    console.log(`🔍 DEBUG LOGIN - Contraseña recibida: ${password ? '[PROVIDED]' : '[MISSING]'}`);
    
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email y contraseña requeridos',
        received: { email: !!email, password: !!password }
      }, { status: 400 });
    }

    // 1. Verificar si existe el email en tenant_users
    console.log(`🔍 DEBUG LOGIN - Buscando usuario con email: ${email.toLowerCase()}`);
    
    const userQuery = `
      SELECT 
        tu.id as user_id,
        tu.email,
        tu.password_hash,
        tu.full_name,
        tu.role,
        tu.is_active,
        tu.email_verified,
        t.id as tenant_id,
        t.name as tenant_name,
        t.email as tenant_email,
        t.status as tenant_status
      FROM tenant_users tu
      LEFT JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.email = $1
      LIMIT 1
    `;
    
    const userResult = await sql.query(userQuery, [email.toLowerCase()]);
    
    console.log(`🔍 DEBUG LOGIN - Usuarios encontrados: ${userResult.rows.length}`);
    
    if (userResult.rows.length === 0) {
      // Verificar si existe el email sin JOIN
      const simpleUserQuery = await sql.query('SELECT email, is_active FROM tenant_users WHERE email = $1', [email.toLowerCase()]);
      console.log(`🔍 DEBUG LOGIN - Búsqueda simple: ${simpleUserQuery.rows.length} resultados`);
      
      // Verificar si hay usuarios con emails similares
      const similarQuery = await sql.query('SELECT email FROM tenant_users WHERE email ILIKE $1', [`%${email.toLowerCase()}%`]);
      console.log(`🔍 DEBUG LOGIN - Emails similares encontrados: ${similarQuery.rows.length}`);
      
      return NextResponse.json({
        error: 'Usuario no encontrado',
        debug: {
          searchedEmail: email.toLowerCase(),
          usersFound: userResult.rows.length,
          simpleSearchResults: simpleUserQuery.rows.length,
          similarEmails: similarQuery.rows.map((row: any) => row.email)
        }
      }, { status: 404 });
    }
    
    const user = userResult.rows[0];
    
    console.log(`🔍 DEBUG LOGIN - Usuario encontrado:`);
    console.log(`  - ID: ${user.user_id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Nombre: ${user.full_name}`);
    console.log(`  - Rol: ${user.role}`);
    console.log(`  - Activo: ${user.is_active}`);
    console.log(`  - Email verificado: ${user.email_verified}`);
    console.log(`  - Tenant ID: ${user.tenant_id}`);
    console.log(`  - Tenant nombre: ${user.tenant_name}`);
    console.log(`  - Tenant email: ${user.tenant_email}`);
    console.log(`  - Tenant estado: ${user.tenant_status}`);
    
    // 2. Verificar estado del usuario
    if (!user.is_active) {
      return NextResponse.json({
        error: 'Usuario inactivo',
        debug: {
          user: {
            email: user.email,
            isActive: user.is_active,
            emailVerified: user.email_verified
          }
        }
      }, { status: 403 });
    }
    
    // 3. Verificar estado del tenant
    if (user.tenant_status && !['active', 'trial'].includes(user.tenant_status)) {
      return NextResponse.json({
        error: 'Tenant inactivo',
        debug: {
          tenant: {
            id: user.tenant_id,
            name: user.tenant_name,
            status: user.tenant_status
          }
        }
      }, { status: 403 });
    }
    
    // 4. Verificar contraseña
    console.log(`🔍 DEBUG LOGIN - Verificando contraseña...`);
    console.log(`🔍 DEBUG LOGIN - Hash almacenado: ${user.password_hash ? '[EXISTS]' : '[MISSING]'}`);
    
    // Importar verifyPassword dinámicamente
    const { verifyPassword } = await import('@/lib/auth');
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    console.log(`🔍 DEBUG LOGIN - Contraseña válida: ${isPasswordValid}`);
    
    if (!isPasswordValid) {
      return NextResponse.json({
        error: 'Contraseña incorrecta',
        debug: {
          user: {
            email: user.email,
            fullName: user.full_name
          },
          passwordProvided: true,
          passwordValid: false
        }
      }, { status: 401 });
    }
    
    // 5. Éxito
    console.log(`✅ DEBUG LOGIN - Login exitoso para ${user.email}`);
    
    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        tenant: {
          id: user.tenant_id,
          name: user.tenant_name,
          email: user.tenant_email,
          status: user.tenant_status
        }
      },
      debug: {
        steps: [
          'Usuario encontrado',
          'Usuario activo',
          'Tenant activo',
          'Contraseña válida'
        ]
      }
    });

  } catch (error) {
    console.error('❌ DEBUG LOGIN - Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
