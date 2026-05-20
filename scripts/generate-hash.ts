/**
 * Genera ADMIN_SECRET_HASH y JWT_SECRET para copiar a Vercel o .env.local (nunca al repo).
 *
 * Uso:
 *   npx ts-node scripts/generate-hash.ts <contraseña>
 *
 * Opcional: ADMIN_SECRET en .env.local solo para esta ejecución (no commitear).
 */

import { hashPassword, generateJWTSecret } from '../src/lib/auth';

async function main() {
  const args = process.argv.slice(2);
  const password = args[0] || process.env.ADMIN_SECRET;

  if (!password) {
    console.error(
      'Error: indica una contraseña como argumento o ADMIN_SECRET en .env.local (solo local).'
    );
    console.log('\nUso:');
    console.log('  npx ts-node scripts/generate-hash.ts <contraseña>');
    process.exit(1);
  }

  console.log('Generando configuración de seguridad...\n');

  const passwordHash = await hashPassword(password);
  const jwtSecret = generateJWTSecret();

  console.log('Copia estas variables en Vercel → Environment Variables (o .env.local):\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`ADMIN_SECRET_HASH=${passwordHash}\n`);
  console.log(`JWT_SECRET=${jwtSecret}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('IMPORTANTE:');
  console.log('  - No crees ni subas archivos .env.security al repositorio.');
  console.log('  - No uses ADMIN_SECRET ni ADMIN_PASSWORD en producción.');
  console.log('  - Si JWT_SECRET estuvo en GitHub, genera uno nuevo y actualiza Vercel.');
  console.log('  - Reinicia / redeploy tras cambiar variables en Vercel.\n');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
