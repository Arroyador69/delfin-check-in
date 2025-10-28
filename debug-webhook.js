#!/usr/bin/env node

/**
 * Script para debuggear el webhook de Stripe
 * Verifica la configuración y logs
 */

const https = require('https');

console.log('🔍 DEBUGGING STRIPE WEBHOOK CONFIGURATION');
console.log('==========================================');

// Verificar variables de entorno
console.log('\n📋 Variables de entorno:');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Configurada' : '❌ Faltante');
console.log('STRIPE_WEBHOOK_SECRET:', process.env.STRIPE_WEBHOOK_SECRET ? '✅ Configurada' : '❌ Faltante');

// URL del webhook
const webhookUrl = 'https://admin.delfincheckin.com/api/stripe/webhook';
console.log('\n🌐 Webhook URL:', webhookUrl);

// Verificar que el endpoint responde
console.log('\n🔗 Verificando endpoint...');

const options = {
  hostname: 'admin.delfincheckin.com',
  port: 443,
  path: '/api/stripe/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Stripe-Signature': 'test-signature'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode === 400) {
      console.log('✅ Endpoint responde (esperado para test sin signature válida)');
    } else {
      console.log('⚠️  Respuesta inesperada');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(JSON.stringify({ test: 'webhook-test' }));
req.end();

console.log('\n📝 Instrucciones para configurar el webhook en Stripe:');
console.log('1. Ve a https://dashboard.stripe.com/webhooks');
console.log('2. Haz clic en "Add endpoint"');
console.log('3. URL del endpoint:', webhookUrl);
console.log('4. Selecciona eventos: invoice.payment_succeeded, payment_intent.succeeded');
console.log('5. Copia el "Signing secret" y añádelo a Vercel como STRIPE_WEBHOOK_SECRET');
console.log('6. Asegúrate de que el webhook esté en modo TEST (no LIVE)');

