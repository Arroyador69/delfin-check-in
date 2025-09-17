#!/usr/bin/env node

/**
 * Cliente PostgreSQL para gestión desde Cursor
 * Uso: node scripts/database-client.js [comando]
 */

import { sql } from '../src/lib/db.js';

const commands = {
  // Estadísticas básicas
  async stats() {
    console.log('📊 ESTADÍSTICAS GENERALES\n');
    
    const rooms = await sql`SELECT COUNT(*) as total FROM rooms`;
    const reservations = await sql`SELECT COUNT(*) as total FROM reservations`;
    const guests = await sql`SELECT COUNT(*) as total FROM guest_registrations`;
    
    console.log(`🏠 Habitaciones: ${rooms[0].total}`);
    console.log(`📅 Reservas: ${reservations[0].total}`);
    console.log(`👥 Registros de huéspedes: ${guests[0].total}`);
  },

  // Reservas recientes
  async reservations() {
    console.log('📅 RESERVAS RECIENTES\n');
    
    const recent = await sql`
      SELECT 
        guest_name,
        check_in,
        check_out,
        channel,
        total_price,
        status
      FROM reservations 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.table(recent);
  },

  // Huéspedes por nacionalidad
  async nationalities() {
    console.log('🌍 HUÉSPEDES POR NACIONALIDAD\n');
    
    const stats = await sql`
      SELECT 
        data->'comunicaciones'->0->'personas'->0->>'nacionalidad' as nacionalidad,
        COUNT(*) as total
      FROM guest_registrations 
      WHERE data->'comunicaciones'->0->'personas'->0->>'nacionalidad' IS NOT NULL
      GROUP BY nacionalidad
      ORDER BY total DESC
    `;
    
    console.table(stats);
  },

  // Ocupación por mes
  async occupancy() {
    console.log('📈 OCUPACIÓN POR MES\n');
    
    const occupancy = await sql`
      SELECT 
        DATE_TRUNC('month', check_in) as mes,
        COUNT(*) as reservas,
        SUM(total_price) as ingresos
      FROM reservations 
      WHERE status = 'confirmed'
      GROUP BY mes
      ORDER BY mes DESC
      LIMIT 12
    `;
    
    console.table(occupancy);
  },

  // Backup de datos críticos
  async backup() {
    console.log('💾 CREANDO BACKUP...\n');
    
    const registrations = await sql`SELECT * FROM guest_registrations ORDER BY created_at DESC`;
    const reservations = await sql`SELECT * FROM reservations ORDER BY created_at DESC`;
    
    const backup = {
      timestamp: new Date().toISOString(),
      guest_registrations: registrations,
      reservations: reservations
    };
    
    const fs = await import('fs');
    const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup guardado en: ${filename}`);
    console.log(`📊 ${registrations.length} registros + ${reservations.length} reservas`);
  },

  // Ayuda
  help() {
    console.log('🛠️ COMANDOS DISPONIBLES:\n');
    console.log('node scripts/database-client.js stats        - Estadísticas generales');
    console.log('node scripts/database-client.js reservations - Reservas recientes');
    console.log('node scripts/database-client.js nationalities- Huéspedes por país');
    console.log('node scripts/database-client.js occupancy    - Ocupación mensual');
    console.log('node scripts/database-client.js backup       - Crear backup local');
    console.log('node scripts/database-client.js help         - Esta ayuda');
  }
};

// Ejecutar comando
const command = process.argv[2] || 'help';

if (commands[command]) {
  commands[command]().catch(console.error);
} else {
  console.error(`❌ Comando desconocido: ${command}`);
  commands.help();
}
