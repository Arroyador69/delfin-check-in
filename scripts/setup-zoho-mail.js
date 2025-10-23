#!/usr/bin/env node

/**
 * 🔧 SCRIPT DE CONFIGURACIÓN PARA ZOHO MAIL
 * 
 * Este script te ayuda a configurar Zoho Mail para el envío de emails
 * de recuperación de contraseña.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupZohoMail() {
  console.log('🔧 CONFIGURACIÓN DE ZOHO MAIL PARA DELFÍN CHECK-IN');
  console.log('='.repeat(60));
  
  console.log('\n📋 PASOS PREVIOS:');
  console.log('1. Ve a https://api-console.zoho.com/');
  console.log('2. Crea una nueva aplicación "Server-based"');
  console.log('3. Configura permisos: ZohoMail.messages.CREATE');
  console.log('4. Obtén Client ID, Client Secret y Refresh Token');
  
  console.log('\n📝 INFORMACIÓN NECESARIA:');
  
  const email = await question('📧 Tu email de Zoho Mail: ');
  const clientId = await question('🔑 Client ID de Zoho: ');
  const clientSecret = await question('🔐 Client Secret de Zoho: ');
  const refreshToken = await question('🔄 Refresh Token de Zoho: ');
  
  console.log('\n📄 VARIABLES DE ENTORNO PARA TU ARCHIVO .env:');
  console.log('='.repeat(60));
  console.log(`ZOHO_MAIL_API_URL=https://mail.zoho.com/api/accounts`);
  console.log(`ZOHO_MAIL_API_KEY=${refreshToken}`);
  console.log(`ZOHO_FROM_EMAIL=${email}`);
  console.log(`ZOHO_FROM_NAME=Delfín Check-in`);
  console.log(`SMTP_HOST=smtp.zoho.com`);
  console.log(`SMTP_PORT=587`);
  console.log(`SMTP_USER=${email}`);
  console.log(`SMTP_PASSWORD=tu_contraseña_de_aplicacion_zoho`);
  console.log(`SMTP_FROM="Delfín Check-in <${email}>"`);
  
  console.log('\n⚠️  IMPORTANTE:');
  console.log('- Usa una contraseña de aplicación, NO tu contraseña normal');
  console.log('- Para crear contraseña de aplicación: Zoho Mail > Configuración > Seguridad > Contraseñas de aplicación');
  console.log('- El Refresh Token se usa para obtener Access Tokens automáticamente');
  
  console.log('\n🧪 PARA PROBAR:');
  console.log('1. Reinicia tu aplicación');
  console.log('2. Ve a /forgot-password');
  console.log('3. Introduce tu email');
  console.log('4. Revisa los logs para ver si el email se envía correctamente');
  
  rl.close();
}

setupZohoMail().catch(console.error);
