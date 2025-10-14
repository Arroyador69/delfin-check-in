import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * 🔍 API PARA VERIFICAR PROBLEMAS DE CONTRASEÑA
 * 
 * Esta API nos ayuda a debuggear problemas con hashes de contraseña
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    console.log(`🔍 CHECK PASSWORD - Email: ${email}`);
    console.log(`🔍 CHECK PASSWORD - Contraseña: ${password ? '[PROVIDED]' : '[MISSING]'}`);
    
    if (!email || !password) {
      return NextResponse.json({
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
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Usuario no encontrado'
      }, { status: 404 });
    }
    
    const user = userResult.rows[0];
    
    console.log(`🔍 CHECK PASSWORD - Usuario encontrado: ${user.email}`);
    
    // 2. Analizar el hash almacenado
    const storedHash = user.password_hash;
    console.log(`🔍 CHECK PASSWORD - Hash almacenado: ${storedHash ? '[EXISTS]' : '[MISSING]'}`);
    console.log(`🔍 CHECK PASSWORD - Longitud del hash: ${storedHash ? storedHash.length : 0}`);
    console.log(`🔍 CHECK PASSWORD - Prefijo del hash: ${storedHash ? storedHash.substring(0, 10) + '...' : 'N/A'}`);
    
    // 3. Verificar formato del hash
    const hashAnalysis = {
      exists: !!storedHash,
      length: storedHash ? storedHash.length : 0,
      prefix: storedHash ? storedHash.substring(0, 10) + '...' : null,
      isBcryptFormat: storedHash ? storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') : false,
      hasSalt: storedHash ? storedHash.includes('$') && storedHash.split('$').length >= 4 : false
    };
    
    // 4. Probar diferentes métodos de verificación
    const verificationResults = {
      ourVerifyPassword: false,
      bcryptCompare: false,
      bcryptCompareSync: false
    };
    
    let verificationError = null;
    
    if (storedHash) {
      try {
        // Método 1: Nuestra función verifyPassword
        console.log(`🔍 CHECK PASSWORD - Probando verifyPassword...`);
        verificationResults.ourVerifyPassword = await verifyPassword(password, storedHash);
        console.log(`🔍 CHECK PASSWORD - verifyPassword resultado: ${verificationResults.ourVerifyPassword}`);
      } catch (error) {
        console.error(`🔍 CHECK PASSWORD - Error en verifyPassword:`, error);
        verificationError = error instanceof Error ? error.message : 'Error desconocido';
      }
      
      try {
        // Método 2: bcrypt.compare directamente
        console.log(`🔍 CHECK PASSWORD - Probando bcrypt.compare...`);
        verificationResults.bcryptCompare = await bcrypt.compare(password, storedHash);
        console.log(`🔍 CHECK PASSWORD - bcrypt.compare resultado: ${verificationResults.bcryptCompare}`);
      } catch (error) {
        console.error(`🔍 CHECK PASSWORD - Error en bcrypt.compare:`, error);
      }
      
      try {
        // Método 3: bcrypt.compareSync
        console.log(`🔍 CHECK PASSWORD - Probando bcrypt.compareSync...`);
        verificationResults.bcryptCompareSync = bcrypt.compareSync(password, storedHash);
        console.log(`🔍 CHECK PASSWORD - bcrypt.compareSync resultado: ${verificationResults.bcryptCompareSync}`);
      } catch (error) {
        console.error(`🔍 CHECK PASSWORD - Error en bcrypt.compareSync:`, error);
      }
    }
    
    // 5. Generar un nuevo hash para comparar
    let newHash = null;
    try {
      console.log(`🔍 CHECK PASSWORD - Generando nuevo hash...`);
      newHash = await hashPassword(password);
      console.log(`🔍 CHECK PASSWORD - Nuevo hash generado: ${newHash ? '[SUCCESS]' : '[FAILED]'}`);
    } catch (error) {
      console.error(`🔍 CHECK PASSWORD - Error generando nuevo hash:`, error);
    }
    
    // 6. Verificar si el nuevo hash funciona
    let newHashVerification = false;
    if (newHash) {
      try {
        newHashVerification = await verifyPassword(password, newHash);
        console.log(`🔍 CHECK PASSWORD - Verificación con nuevo hash: ${newHashVerification}`);
      } catch (error) {
        console.error(`🔍 CHECK PASSWORD - Error verificando nuevo hash:`, error);
      }
    }
    
    // 7. Resultado final
    const isPasswordValid = verificationResults.ourVerifyPassword || verificationResults.bcryptCompare || verificationResults.bcryptCompareSync;
    
    console.log(`🔍 CHECK PASSWORD - Resultado final: ${isPasswordValid}`);
    
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
        verificationResults,
        verificationError,
        newHashGenerated: !!newHash,
        newHashVerification,
        finalResult: isPasswordValid
      },
      debug: {
        steps: [
          'Usuario encontrado',
          'Hash analizado',
          'Verificaciones probadas',
          'Nuevo hash generado',
          'Resultado final calculado'
        ]
      }
    });

  } catch (error) {
    console.error('❌ CHECK PASSWORD - Error:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}
