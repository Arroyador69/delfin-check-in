#!/usr/bin/env node

/**
 * Script para verificar la configuración del webhook de Stripe
 * y probar el flujo de contratación desde la landing page
 */

const https = require('https');
const fs = require('fs');

console.log('🔍 Verificando configuración de Stripe Webhook...\n');

// Verificar variables de entorno
function checkEnvVars() {
  console.log('📋 Variables de entorno:');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`❌ ${varName}: NO CONFIGURADA`);
      allPresent = false;
    }
  });
  
  return allPresent;
}

// Verificar webhook de Stripe
async function checkStripeWebhook() {
  console.log('\n🔗 Verificando webhook de Stripe...');
  
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/webhook`;
    console.log(`📍 URL del webhook: ${webhookUrl}`);
    
    // Hacer una petición GET para verificar que el endpoint existe
    const response = await fetch(webhookUrl, { method: 'GET' });
    
    if (response.status === 405) { // Method Not Allowed es esperado para GET
      console.log('✅ Webhook endpoint está activo');
      return true;
    } else {
      console.log(`⚠️ Respuesta inesperada: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error verificando webhook: ${error.message}`);
    return false;
  }
}

// Verificar endpoint de create-payment-intent
async function checkPaymentIntentEndpoint() {
  console.log('\n💳 Verificando endpoint de create-payment-intent...');
  
  try {
    const endpointUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/create-payment-intent`;
    console.log(`📍 URL del endpoint: ${endpointUrl}`);
    
    // Hacer una petición POST con datos de prueba
    const testData = {
      planId: 'basic',
      email: 'test@delfincheckin.com',
      name: 'Test User'
    };
    
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Endpoint de create-payment-intent funciona');
      console.log(`📄 Client secret recibido: ${data.client_secret ? 'Sí' : 'No'}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Error en endpoint: ${response.status} - ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error verificando endpoint: ${error.message}`);
    return false;
  }
}

// Verificar base de datos
async function checkDatabase() {
  console.log('\n🗄️ Verificando conexión a base de datos...');
  
  try {
    const dbUrl = process.env.POSTGRES_URL;
    if (!dbUrl) {
      console.log('❌ POSTGRES_URL no configurada');
      return false;
    }
    
    console.log(`✅ POSTGRES_URL configurada: ${dbUrl.substring(0, 30)}...`);
    
    // Verificar que las tablas existen haciendo una consulta simple
    const { sql } = require('@vercel/postgres');
    const result = await sql`SELECT COUNT(*) as count FROM tenants LIMIT 1`;
    console.log('✅ Conexión a base de datos exitosa');
    return true;
  } catch (error) {
    console.log(`❌ Error conectando a base de datos: ${error.message}`);
    return false;
  }
}

// Función principal
async function main() {
  console.log('🐬 Delfín Check-in - Verificación de Flujo de Contratación\n');
  
  const checks = [
    { name: 'Variables de entorno', fn: checkEnvVars },
    { name: 'Webhook de Stripe', fn: checkStripeWebhook },
    { name: 'Endpoint de pago', fn: checkPaymentIntentEndpoint },
    { name: 'Base de datos', fn: checkDatabase }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.log(`❌ Error en ${check.name}: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 ¡TODOS LOS CHECKS PASARON!');
    console.log('✅ El flujo de contratación debería funcionar correctamente');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Ir a https://delfincheckin.com');
    console.log('2. Hacer clic en "Contratar" en cualquier plan');
    console.log('3. Usar tarjeta de prueba: 4242 4242 4242 4242');
    console.log('4. Verificar que se recibe email de onboarding');
  } else {
    console.log('❌ ALGUNOS CHECKS FALLARON');
    console.log('⚠️ Revisar la configuración antes de probar el flujo');
  }
  
  console.log('\n📖 Para más detalles, consulta: test-landing-flow.md');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
