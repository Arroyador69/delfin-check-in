// =====================================================
// SCRIPT FÁCIL: Crear usuario de prueba usando API
// =====================================================
// Este script usa el endpoint API que ya está desplegado
// No requiere acceso directo a la base de datos

const https = require('https');
const http = require('http');

// Configuración
const API_URL = process.env.API_URL || 'https://admin.delfincheckin.com';
const TEST_EMAIL = 'appconnect-test@delfincheckin.com';
const TEST_PASSWORD = 'AppConnect2024!';
const TEST_ROLE = 'owner';

// Función para hacer peticiones HTTP/HTTPS
function makeRequest(url, options = {}, data = null) {
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
  const tenantId = process.env.TENANT_ID;

  if (!tenantId) {
    console.error('❌ Error: TENANT_ID no está definido');
    console.log('\n💡 CÓMO OBTENER EL TENANT_ID:');
    console.log('\n1. Opción más fácil - Desde el Admin Panel:');
    console.log('   - Ve a https://admin.delfincheckin.com');
    console.log('   - Inicia sesión con tu cuenta');
    console.log('   - Abre las herramientas de desarrollador (F12)');
    console.log('   - Ve a la pestaña "Application" > "Local Storage"');
    console.log('   - Busca una clave que contenga "tenant" o "tenant_id"');
    console.log('   - O busca en el código fuente de la página (Ctrl+F "tenant")');
    console.log('\n2. Opción alternativa - Consultar la base de datos:');
    console.log('   - Si tienes acceso a Neon, ejecuta:');
    console.log('     SELECT id, name FROM tenants LIMIT 1;');
    console.log('\n3. Ejecuta el script con:');
    console.log(`   TENANT_ID="uuid-del-tenant" node scripts/create-test-user-easy.js`);
    console.log('\n4. O usa el script directo a BD (requiere DATABASE_URL):');
    console.log('   DATABASE_URL="postgresql://..." node scripts/create-test-user.js');
    process.exit(1);
  }

  try {
    console.log('📡 Creando usuario mediante API...');
    console.log(`🌐 API URL: ${API_URL}`);
    console.log(`🏢 Tenant ID: ${tenantId}`);
    console.log('');

    const response = await makeRequest(
      `${API_URL}/api/admin/create-tenant-user`,
      { method: 'POST' },
      {
        tenantId: tenantId,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: TEST_ROLE
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log('');
      console.log('='.repeat(60));
      console.log('✅ USUARIO DE PRUEBA CREADO EXITOSAMENTE');
      console.log('='.repeat(60));
      console.log(`📧 Email: ${TEST_EMAIL}`);
      console.log(`🔑 Contraseña: ${TEST_PASSWORD}`);
      console.log(`👤 Rol: ${TEST_ROLE}`);
      console.log('='.repeat(60));
      console.log('');
      console.log('💡 Comparte estas credenciales con el equipo de AppConnect');
      console.log('   para que puedan probar la aplicación móvil.');
      console.log('');
    } else if (response.status === 409) {
      console.log('⚠️  El usuario ya existe.');
      console.log('💡 El usuario fue creado anteriormente. Las credenciales son:');
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Contraseña: ${TEST_PASSWORD}`);
      console.log('');
      console.log('💡 Si necesitas cambiar la contraseña, usa el script:');
      console.log('   DATABASE_URL="..." node scripts/create-test-user.js');
    } else {
      console.error('❌ Error creando usuario (HTTP ' + response.status + '):');
      console.error(JSON.stringify(response.data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Verifica que la API_URL sea correcta y que el servidor esté accesible');
    }
    process.exit(1);
  }
}

// Ejecutar script
createTestUser();

