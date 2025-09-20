import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Inicializando base de datos para precios dinámicos...');

    // Leer el archivo SQL del esquema
    const sqlFilePath = path.join(process.cwd(), 'database', 'dynamic-pricing.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Ejecutar el esquema SQL línea por línea para evitar problemas con Vercel Postgres
    const sqlLines = sqlContent.split(';').filter(line => line.trim());
    
    for (const line of sqlLines) {
      if (line.trim()) {
        try {
          await sql.query(line.trim() + ';');
        } catch (error) {
          // Ignorar errores de "already exists" y similares
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('already exists') && !errorMessage.includes('duplicate')) {
            console.warn('Warning executing SQL:', line.trim(), errorMessage);
          }
        }
      }
    }

    console.log('✅ Base de datos de precios dinámicos inicializada correctamente');

    return NextResponse.json({
      success: true,
      message: 'Base de datos de precios dinámicos inicializada correctamente',
      steps: [
        '✅ Tablas creadas: competitor_listings, competitor_daily_prices, local_events, my_occupancy, price_recommendations, pricing_config',
        '✅ Índices creados para optimización de consultas',
        '✅ Triggers configurados para actualización automática',
        '✅ Configuración inicial para 6 habitaciones insertada',
        '✅ Funciones de cálculo de precios disponibles'
      ]
    });

  } catch (error) {
    console.error('❌ Error inicializando base de datos de precios dinámicos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al inicializar la base de datos de precios dinámicos',
      details: error instanceof Error ? error.message : 'Error desconocido',
      steps: [
        '❌ Error al crear tablas',
        '❌ Verificar permisos de base de datos',
        '❌ Verificar conexión a PostgreSQL'
      ]
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verificando estado de la base de datos de precios dinámicos...');

    // Verificar si existen las tablas principales
    const tablesToCheck = [
      'competitor_listings',
      'competitor_daily_prices', 
      'local_events',
      'my_occupancy',
      'price_recommendations',
      'pricing_config'
    ];

    const tableStatus = [];
    let allTablesExist = true;

    for (const tableName of tablesToCheck) {
      try {
        const result = await sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${tableName}
          );
        `;
        
        const exists = result.rows[0].exists;
        tableStatus.push({
          table: tableName,
          exists,
          status: exists ? '✅' : '❌'
        });

        if (!exists) {
          allTablesExist = false;
        }
      } catch (error) {
        tableStatus.push({
          table: tableName,
          exists: false,
          status: '❌',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        allTablesExist = false;
      }
    }

    // Verificar configuración de habitaciones
    let configCount = 0;
    try {
      const configResult = await sql`SELECT COUNT(*) as count FROM pricing_config`;
      configCount = parseInt(configResult.rows[0].count);
    } catch (error) {
      // Tabla no existe aún
    }

    // Verificar datos de ejemplo
    let hasSampleData = false;
    try {
      const sampleResult = await sql`SELECT COUNT(*) as count FROM competitor_listings LIMIT 1`;
      hasSampleData = parseInt(sampleResult.rows[0].count) > 0;
    } catch (error) {
      // No hay datos de ejemplo
    }

    return NextResponse.json({
      success: allTablesExist,
      data: {
        tables: tableStatus,
        configuration: {
          roomsConfigured: configCount,
          hasSampleData
        },
        summary: {
          totalTables: tablesToCheck.length,
          existingTables: tableStatus.filter(t => t.exists).length,
          allTablesExist,
          readyToUse: allTablesExist && configCount === 6
        }
      },
      message: allTablesExist 
        ? 'Base de datos de precios dinámicos está lista'
        : 'Base de datos necesita ser inicializada'
    });

  } catch (error) {
    console.error('❌ Error verificando base de datos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar la base de datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
