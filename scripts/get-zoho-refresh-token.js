#!/usr/bin/env node

/**
 * 🔑 SCRIPT PARA OBTENER REFRESH TOKEN DE ZOHO
 * 
 * Este script te ayuda a obtener el refresh token necesario
 * para configurar Zoho Mail en producción.
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

async function getZohoRefreshToken() {
  console.log('🔑 OBTENER REFRESH TOKEN DE ZOHO PARA PRODUCCIÓN');
  console.log('='.repeat(60));
  
  console.log('\n📋 PASOS PREVIOS:');
  console.log('1. Ve a https://api-console.zoho.com/');
  console.log('2. Crea una aplicación "Server-based"');
  console.log('3. URL de redirección: https://admin.delfincheckin.com/auth/zoho/callback');
  console.log('4. Permisos: ZohoMail.messages.CREATE');
  
  const clientId = await question('\n🔑 Client ID de Zoho: ');
  const clientSecret = await question('🔐 Client Secret de Zoho: ');
  
  console.log('\n🌐 PASO 1: Autorizar aplicación');
  console.log('='.repeat(40));
  
  const authUrl = `https://accounts.zoho.eu/oauth/v2/auth?scope=ZohoMail.messages.CREATE&client_id=${clientId}&response_type=code&redirect_uri=https://admin.delfincheckin.com/auth/zoho/callback&access_type=offline`;
  
  console.log('1. Abre este enlace en tu navegador:');
  console.log(authUrl);
  console.log('\n2. Autoriza la aplicación');
  console.log('3. Copia el código de autorización de la URL de redirección');
  
  const authCode = await question('\n📝 Código de autorización: ');
  
  console.log('\n🔄 PASO 2: Intercambiar código por tokens');
  console.log('='.repeat(40));
  
  try {
    const response = await fetch('https://accounts.zoho.eu/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://admin.delfincheckin.com/auth/zoho/callback',
        code: authCode
      })
    });

    if (response.ok) {
      const data = await response.json();
      
      console.log('\n✅ TOKENS OBTENIDOS EXITOSAMENTE');
      console.log('='.repeat(40));
      console.log(`Access Token: ${data.access_token}`);
      console.log(`Refresh Token: ${data.refresh_token}`);
      console.log(`Expires In: ${data.expires_in} segundos`);
      
      console.log('\n📄 VARIABLES PARA VERCEL:');
      console.log('='.repeat(40));
      console.log(`ZOHO_CLIENT_ID=${clientId}`);
      console.log(`ZOHO_CLIENT_SECRET=${clientSecret}`);
      console.log(`ZOHO_REFRESH_TOKEN=${data.refresh_token}`);
      console.log(`ZOHO_FROM_EMAIL=tu_email@tudominio.com`);
      console.log(`ZOHO_FROM_NAME=Delfín Check-in`);
      
      console.log('\n⚠️  IMPORTANTE:');
      console.log('- Guarda el Refresh Token de forma segura');
      console.log('- El Access Token expira, pero el Refresh Token es permanente');
      console.log('- Agrega estas variables en Vercel → Settings → Environment Variables');
      
    } else {
      const error = await response.text();
      console.log('❌ Error obteniendo tokens:', response.status, error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  rl.close();
}

getZohoRefreshToken().catch(console.error);
