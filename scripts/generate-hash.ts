/**
 * 🔐 SCRIPT PARA GENERAR HASH DE CONTRASEÑA
 * 
 * Uso:
 * npx ts-node scripts/generate-hash.ts [contraseña]
 * 
 * Si no se proporciona contraseña, usa ADMIN_SECRET del .env
 */

import { hashPassword, generateJWTSecret } from '../src/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const password = args[0] || process.env.ADMIN_SECRET;

  if (!password) {
    console.error('❌ Error: Debes proporcionar una contraseña o configurar ADMIN_SECRET en .env');
    console.log('\nUso:');
    console.log('  npx ts-node scripts/generate-hash.ts <contraseña>');
    console.log('  o configurar ADMIN_SECRET en .env y ejecutar: npx ts-node scripts/generate-hash.ts');
    process.exit(1);
  }

  console.log('🔐 Generando configuración de seguridad...\n');

  // Generar hash de contraseña
  console.log('📝 Hasheando contraseña con bcrypt...');
  const passwordHash = await hashPassword(password);
  
  // Generar JWT secret
  console.log('🔑 Generando JWT_SECRET...');
  const jwtSecret = generateJWTSecret();

  console.log('\n✅ Configuración generada exitosamente!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 AGREGA ESTAS VARIABLES A TU ARCHIVO .env:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`# Contraseña hasheada con bcrypt (12 rounds)`);
  console.log(`ADMIN_SECRET_HASH=${passwordHash}\n`);
  
  console.log(`# Secreto para firmar JWT (64 caracteres aleatorios)`);
  console.log(`JWT_SECRET=${jwtSecret}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('⚠️  IMPORTANTE:');
  console.log('   1. Copia estas variables a tu archivo .env');
  console.log('   2. NUNCA compartas estos valores');
  console.log('   3. ELIMINA la variable ADMIN_SECRET del .env');
  console.log('   4. ELIMINA la variable ADMIN_PASSWORD del .env');
  console.log('   5. Reinicia tu servidor después de actualizar');
  
  console.log('\n📊 Información de la contraseña:');
  console.log(`   - Longitud: ${password.length} caracteres`);
  console.log(`   - Hash bcrypt: ${passwordHash.length} caracteres`);
  console.log(`   - JWT Secret: ${jwtSecret.length} caracteres`);

  // Opcionalmente, escribir a un archivo
  const envContent = `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🔐 CONFIGURACIÓN DE SEGURIDAD
# Generado: ${new Date().toLocaleString('es-ES')}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Contraseña hasheada con bcrypt (12 rounds)
# NO almacenes la contraseña en texto plano
ADMIN_SECRET_HASH=${passwordHash}

# Secreto para firmar tokens JWT
# Este valor NUNCA debe ser compartido
JWT_SECRET=${jwtSecret}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# ⚠️  ELIMINAR ESTAS VARIABLES (ya no son necesarias):
# - ADMIN_SECRET
# - ADMIN_PASSWORD
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  const outputFile = path.join(process.cwd(), '.env.security');
  fs.writeFileSync(outputFile, envContent.trim());
  
  console.log(`\n💾 Configuración guardada en: .env.security`);
  console.log('   Puedes copiar el contenido a tu .env principal\n');
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

