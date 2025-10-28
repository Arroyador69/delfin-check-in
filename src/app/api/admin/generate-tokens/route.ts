import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateTokenPair } from '@/lib/auth';

// POST: Generar tokens para usuarios existentes sin token
export async function POST(request: NextRequest) {
  try {
    // Para desarrollo, permitir sin autenticación
    // En producción, deberías añadir autenticación aquí

    console.log('🔍 Buscando usuarios sin token...');
    
    // Buscar usuarios sin token
    const usersWithoutToken = await sql`
      SELECT id, tenant_id, email, role
      FROM tenant_users
      WHERE auth_token IS NULL
    `;
    
    console.log(`📊 Encontrados ${usersWithoutToken.rows.length} usuarios sin token`);
    
    if (usersWithoutToken.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Todos los usuarios ya tienen token asignado',
        tokensGenerated: 0
      });
    }
    
    const results = [];
    
    // Generar tokens para cada usuario
    for (const user of usersWithoutToken.rows) {
      try {
        const tokenPair = generateTokenPair({
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          role: user.role
        });
        
        // Usar solo el accessToken (más corto que refreshToken)
        const shortToken = tokenPair.accessToken;
        
        // Actualizar usuario con el token
        await sql`
          UPDATE tenant_users
          SET auth_token = ${shortToken}
          WHERE id = ${user.id}
        `;
        
        results.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          success: true
        });
        
        console.log(`✅ Token generado para ${user.email} (${user.role})`);
      } catch (error) {
        console.error(`❌ Error generando token para ${user.email}:`, error);
        results.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Proceso completado: ${successCount} tokens generados, ${errorCount} errores`,
      tokensGenerated: successCount,
      errors: errorCount,
      results
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}

// GET: Verificar estado de tokens
export async function GET(request: NextRequest) {
  try {
    // Para desarrollo, permitir sin autenticación
    // En producción, deberías añadir autenticación aquí

    const stats = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(auth_token) as users_with_token,
        COUNT(*) - COUNT(auth_token) as users_without_token
      FROM tenant_users
    `;
    
    return NextResponse.json({
      success: true,
      stats: stats.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}
