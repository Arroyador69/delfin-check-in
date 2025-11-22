// =====================================================
// SCRIPT ALTERNATIVO: Crear usuario usando API
// =====================================================
// Este script usa el endpoint API para crear el usuario
// Útil si no tienes acceso directo a la base de datos

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.API_URL || 'https://admin.delfincheckin.com';
const TEST_EMAIL = 'appconnect-test@delfincheckin.com';
const TEST_PASSWORD = 'AppConnect2024!';
const TEST_ROLE = 'owner';

// Necesitarás un tenant_id existente
// Puedes obtenerlo consultando la base de datos o usando el admin panel
const TENANT_ID = process.env.TENANT_ID;

if (!TENANT_ID) {
  console.error('❌ Error: TENANT_ID no está definido');
  console.log('💡 Necesitas proporcionar un tenant_id existente');
  console.log('   Ejemplo: TENANT_ID="uuid-del-tenant" node scripts/create-test-user-api.js');
  process.exit(1);
}

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function createTestUser() {
  try {
    console.log('📡 Creando usuario mediante API...');
    console.log(`🌐 API URL: ${API_URL}`);
    console.log(`🏢 Tenant ID: ${TENANT_ID}`);

    const response = await makeRequest(
      `${API_URL}/api/admin/create-tenant-user`,
      { method: 'POST' },
      {
        tenantId: TENANT_ID,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: TEST_ROLE
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ USUARIO DE PRUEBA CREADO EXITOSAMENTE');
      console.log('='.repeat(60));
      console.log(`📧 Email: ${TEST_EMAIL}`);
      console.log(`🔑 Contraseña: ${TEST_PASSWORD}`);
      console.log(`👤 Rol: ${TEST_ROLE}`);
      console.log('='.repeat(60));
      console.log('\n💡 Comparte estas credenciales con el equipo de AppConnect');
      console.log('   para que puedan probar la aplicación móvil.\n');
    } else if (response.status === 409) {
      console.log('⚠️  El usuario ya existe. Actualiza la contraseña manualmente o');
      console.log('   usa el script create-test-user.js que actualiza automáticamente.');
    } else {
      console.error('❌ Error creando usuario:', response.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar script
createTestUser();

