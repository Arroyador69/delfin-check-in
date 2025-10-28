// ========================================
// SCRIPT: Generar tokens para usuarios existentes
// ========================================
// Este script genera tokens JWT para todos los usuarios existentes
// que no tengan un token asignado

const { sql } = require('@vercel/postgres');
const jwt = require('jsonwebtoken');

// Función para generar token JWT (simplificada)
function generateToken(payload) {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.sign(payload, secret, { expiresIn: '1y' });
}

async function generateTokensForExistingUsers() {
  try {
    console.log('🔍 Buscando usuarios sin token...');
    
    // Buscar usuarios sin token
    const usersWithoutToken = await sql`
      SELECT id, tenant_id, email, role
      FROM tenant_users
      WHERE auth_token IS NULL
    `;
    
    console.log(`📊 Encontrados ${usersWithoutToken.rows.length} usuarios sin token`);
    
    if (usersWithoutToken.rows.length === 0) {
      console.log('✅ Todos los usuarios ya tienen token asignado');
      return;
    }
    
    // Generar tokens para cada usuario
    for (const user of usersWithoutToken.rows) {
      try {
        const token = generateToken({
          userId: user.id,
          tenantId: user.tenant_id,
          email: user.email,
          role: user.role
        });
        
        // Actualizar usuario con el token
        await sql`
          UPDATE tenant_users
          SET auth_token = ${token}
          WHERE id = ${user.id}
        `;
        
        console.log(`✅ Token generado para ${user.email} (${user.role})`);
      } catch (error) {
        console.error(`❌ Error generando token para ${user.email}:`, error);
      }
    }
    
    console.log('🎉 Proceso completado');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateTokensForExistingUsers();
}

module.exports = { generateTokensForExistingUsers };
