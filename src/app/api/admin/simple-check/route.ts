import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * 🔍 API SIMPLE PARA VERIFICAR CONTRASEÑA
 * 
 * Esta API no requiere autenticación y nos ayuda a debuggear problemas con hashes
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log(`🔍 SIMPLE CHECK - Email: ${email}`);
    console.log(`🔍 SIMPLE CHECK - Contraseña: ${password ? '[PROVIDED]' : '[MISSING]'}`);
    
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email y contraseña requeridos'
      }, { status: 400 });
    }

    // 1. Buscar el usuario y su hash
    const userQuery = `
      SELECT 
        tu.id as user_id,
        tu.email,
        tu.password_hash,
        tu.full_name,
        tu.role,
        tu.is_active,
        t.name as tenant_name,
        t.status as tenant_status
      FROM tenant_users tu
      LEFT JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.email = $1
      LIMIT 1
    `;
    
    const userResult = await sql.query(userQuery, [email.toLowerCase()]);
    
    console.log(`🔍 SIMPLE CHECK - Usuarios encontrados: ${userResult.rows.length}`);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado',
        debug: {
          searchedEmail: email.toLowerCase(),
          usersFound: 0
        }
      }, { status: 404 });
    }
    
    const user = userResult.rows[0];
    
    console.log(`🔍 SIMPLE CHECK - Usuario encontrado: ${user.email}`);
    
    // 2. Analizar el hash almacenado
    const storedHash = user.password_hash;
    const hashAnalysis = {
      exists: !!storedHash,
      length: storedHash ? storedHash.length : 0,
      prefix: storedHash ? storedHash.substring(0, 10) + '...' : null,
      isBcryptFormat: storedHash ? storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$') : false
    };
    
    console.log(`🔍 SIMPLE CHECK - Hash existe: ${hashAnalysis.exists}`);
    console.log(`🔍 SIMPLE CHECK - Hash formato bcrypt: ${hashAnalysis.isBcryptFormat}`);
    
    // 3. Probar verificación con bcrypt directamente
    let passwordValid = false;
    let verificationError = null;
    
    if (storedHash) {
      try {
        console.log(`🔍 SIMPLE CHECK - Probando bcrypt.compare...`);
        passwordValid = await bcrypt.compare(password, storedHash);
        console.log(`🔍 SIMPLE CHECK - Resultado: ${passwordValid}`);
      } catch (error) {
        console.error(`🔍 SIMPLE CHECK - Error en bcrypt.compare:`, error);
        verificationError = error instanceof Error ? error.message : 'Error desconocido';
      }
    }
    
    // 4. Generar un nuevo hash para comparar
    let newHash = null;
    let newHashValid = false;
    
    try {
      console.log(`🔍 SIMPLE CHECK - Generando nuevo hash...`);
      const salt = await bcrypt.genSalt(12);
      newHash = await bcrypt.hash(password, salt);
      
      // Verificar que el nuevo hash funciona
      newHashValid = await bcrypt.compare(password, newHash);
      console.log(`🔍 SIMPLE CHECK - Nuevo hash válido: ${newHashValid}`);
    } catch (error) {
      console.error(`🔍 SIMPLE CHECK - Error generando nuevo hash:`, error);
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        isActive: user.is_active,
        tenant: {
          name: user.tenant_name,
          status: user.tenant_status
        }
      },
      passwordAnalysis: {
        hashAnalysis,
        passwordValid,
        verificationError,
        newHashGenerated: !!newHash,
        newHashValid
      },
      message: passwordValid ? 'Contraseña válida' : 'Contraseña inválida'
    });

  } catch (error) {
    console.error('❌ SIMPLE CHECK - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
