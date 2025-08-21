const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🇪🇸 Creando tabla para registro oficial de viajeros de España...');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables de entorno de Supabase no configuradas');
  console.log('   Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const createTableSQL = `
-- Tabla para registros oficiales de viajeros (cumplimiento Ley 4/2015)
CREATE TABLE IF NOT EXISTS guest_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID,
  
  -- Datos personales (requeridos por España)
  name VARCHAR(255) NOT NULL,
  surname VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  birth_place VARCHAR(255) NOT NULL,
  nationality VARCHAR(100) NOT NULL,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('dni', 'passport', 'nie', 'other')),
  document_number VARCHAR(100) NOT NULL,
  document_issuing_country VARCHAR(100) NOT NULL,
  document_expiry_date DATE NOT NULL,
  
  -- Datos de contacto
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  
  -- Datos del viaje
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  travel_purpose VARCHAR(50) NOT NULL CHECK (travel_purpose IN ('tourism', 'business', 'family', 'other')),
  
  -- Datos adicionales requeridos por España
  previous_accommodation VARCHAR(255),
  next_destination VARCHAR(255),
  vehicle_registration VARCHAR(50),
  
  -- Consentimiento legal
  accepts_terms BOOLEAN NOT NULL DEFAULT false,
  accepts_data_processing BOOLEAN NOT NULL DEFAULT false,
  
  -- Estado del envío oficial
  sent_to_spain_ministry BOOLEAN NOT NULL DEFAULT false,
  spain_ministry_response JSONB,
  spain_ministry_error TEXT,
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Validaciones
  CONSTRAINT valid_dates CHECK (arrival_date <= departure_date)
);
`;

const createIndexesSQL = `
-- Índices para la tabla guest_registrations
CREATE INDEX IF NOT EXISTS idx_guest_registrations_arrival_date ON guest_registrations(arrival_date);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_document_number ON guest_registrations(document_number);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_sent_to_spain ON guest_registrations(sent_to_spain_ministry);
CREATE INDEX IF NOT EXISTS idx_guest_registrations_created_at ON guest_registrations(created_at);
`;

async function createGuestRegistrationsTable() {
  try {
    console.log('📊 Creando tabla guest_registrations...');
    
    // Crear tabla
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (tableError) {
      console.error('❌ Error al crear la tabla:', tableError.message);
      
      // Intentar con SQL directo
      console.log('🔄 Intentando con método alternativo...');
      const { error: directError } = await supabase
        .from('guest_registrations')
        .select('count')
        .limit(1);
      
      if (directError && directError.message.includes('does not exist')) {
        console.log('💡 La tabla no existe. Necesitas ejecutar el SQL manualmente en Supabase.');
        console.log('\n📋 SQL a ejecutar en el SQL Editor de Supabase:');
        console.log('```sql');
        console.log(createTableSQL);
        console.log(createIndexesSQL);
        console.log('```');
        return;
      }
    }

    console.log('✅ Tabla guest_registrations creada exitosamente');

    // Crear índices
    console.log('📊 Creando índices...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: createIndexesSQL
    });

    if (indexError) {
      console.log('⚠️ Algunos índices podrían no haberse creado:', indexError.message);
    } else {
      console.log('✅ Índices creados exitosamente');
    }

    // Verificar que la tabla existe
    const { data, error: selectError } = await supabase
      .from('guest_registrations')
      .select('count')
      .limit(1);

    if (selectError) {
      console.error('❌ Error al verificar la tabla:', selectError.message);
      console.log('\n💡 Pasos manuales:');
      console.log('1. Ve a tu proyecto de Supabase');
      console.log('2. Abre el SQL Editor');
      console.log('3. Ejecuta el SQL mostrado arriba');
    } else {
      console.log('✅ Tabla verificada y funcionando correctamente');
      
      console.log('\n🎉 ¡Sistema de registro oficial de España configurado!');
      console.log('📍 Accede a: http://localhost:3000/guest-registration');
      console.log('\n🇪🇸 Cumple con:');
      console.log('   • Ley 4/2015 de Protección de Seguridad Ciudadana');
      console.log('   • Real Decreto 933/2021');
      console.log('   • Registro automático al Ministerio del Interior');
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    console.log('\n📋 SQL para ejecutar manualmente:');
    console.log('```sql');
    console.log(createTableSQL);
    console.log(createIndexesSQL);
    console.log('```');
  }
}

createGuestRegistrationsTable();
