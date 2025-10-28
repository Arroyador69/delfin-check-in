import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    console.log('🔍 Verificando esquema de base de datos para precios dinámicos...');
    
    // Verificar qué tablas existen
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN (
          'competitor_listings',
          'competitor_daily_prices', 
          'local_events',
          'my_occupancy',
          'pricing_config',
          'price_recommendations'
        )
      ORDER BY table_name;
    `;
    
    const existingTables = tablesCheck.rows.map(row => row.table_name);
    const expectedTables = [
      'competitor_listings',
      'competitor_daily_prices', 
      'local_events',
      'my_occupancy',
      'pricing_config',
      'price_recommendations'
    ];
    
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    // Verificar columnas de competitor_daily_prices si existe
    let competitorPricesColumns: Array<{column_name: string, data_type: string}> = [];
    if (existingTables.includes('competitor_daily_prices')) {
      const columnsCheck = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'competitor_daily_prices' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      competitorPricesColumns = columnsCheck.rows as Array<{column_name: string, data_type: string}>;
    }
    
    // Verificar si hay datos
    let dataCounts: Record<string, number | string> = {};
    for (const table of existingTables) {
      try {
        const countResult = await sql.query(`SELECT COUNT(*) as count FROM ${table}`);
        dataCounts[table] = parseInt(countResult.rows[0]?.count || '0');
      } catch (error) {
        dataCounts[table] = 'Error: ' + (error instanceof Error ? error.message : String(error));
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        existingTables,
        missingTables,
        competitorPricesColumns,
        dataCounts,
        schemaStatus: missingTables.length === 0 ? 'Complete' : 'Incomplete'
      }
    });
    
  } catch (error) {
    console.error('Error verificando esquema:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al verificar esquema: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    console.log('🔧 Reparando esquema de base de datos...');
    
    const steps = [];
    
    // Crear tablas que faltan
    const createTablesSQL = `
      -- Tabla para competidores locales
      CREATE TABLE IF NOT EXISTS competitor_listings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        address TEXT,
        lat DOUBLE PRECISION,
        lon DOUBLE PRECISION,
        source TEXT NOT NULL DEFAULT 'manual',
        engine TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Tabla para precios diarios de competidores
      CREATE TABLE IF NOT EXISTS competitor_daily_prices (
        id BIGSERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES competitor_listings(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        room_type TEXT NOT NULL DEFAULT 'standard',
        price NUMERIC(10,2),
        availability BOOLEAN DEFAULT true,
        scraped_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(listing_id, date, room_type)
      );

      -- Tabla para eventos locales
      CREATE TABLE IF NOT EXISTS local_events (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP,
        venue TEXT,
        city TEXT DEFAULT 'Fuengirola',
        url TEXT,
        source TEXT NOT NULL,
        impact_level SMALLINT DEFAULT 0,
        attendees_estimate INTEGER,
        distance_km NUMERIC(5,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Tabla para ocupación propia
      CREATE TABLE IF NOT EXISTS my_occupancy (
        id BIGSERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        occupancy_pct NUMERIC(5,2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Tabla para configuración de precios
      CREATE TABLE IF NOT EXISTS pricing_config (
        id SERIAL PRIMARY KEY,
        room_id TEXT UNIQUE NOT NULL,
        base_price NUMERIC(10,2) NOT NULL,
        min_price NUMERIC(10,2) DEFAULT 0,
        max_price NUMERIC(10,2) DEFAULT 9999,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );

      -- Tabla para recomendaciones de precios
      CREATE TABLE IF NOT EXISTS price_recommendations (
        id BIGSERIAL PRIMARY KEY,
        room_id TEXT NOT NULL,
        date DATE NOT NULL,
        current_price NUMERIC(10,2),
        recommended_price NUMERIC(10,2) NOT NULL,
        market_p40 NUMERIC(10,2),
        factors JSONB,
        confidence_score NUMERIC(5,2) DEFAULT 0,
        applied BOOLEAN DEFAULT false,
        calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(room_id, date)
      );
    `;
    
    // Ejecutar creación de tablas
    await sql.query(createTablesSQL);
    steps.push('✅ Tablas creadas correctamente');
    
    // Crear índices
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_date ON competitor_daily_prices(date);
      CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_listing_date ON competitor_daily_prices(listing_id, date);
      CREATE INDEX IF NOT EXISTS idx_local_events_starts_at ON local_events(starts_at);
      CREATE INDEX IF NOT EXISTS idx_local_events_impact ON local_events(impact_level);
      CREATE INDEX IF NOT EXISTS idx_my_occupancy_date ON my_occupancy(date);
      CREATE INDEX IF NOT EXISTS idx_price_recommendations_date ON price_recommendations(date);
      CREATE INDEX IF NOT EXISTS idx_price_recommendations_room_date ON price_recommendations(room_id, date);
    `;
    
    await sql.query(createIndexesSQL);
    steps.push('✅ Índices creados correctamente');
    
    // Insertar datos iniciales si no existen
    const existingConfig = await sql`SELECT COUNT(*) FROM pricing_config`;
    if (parseInt(existingConfig.rows[0]?.count || '0') === 0) {
      await sql`
        INSERT INTO pricing_config (room_id, base_price, min_price, max_price) VALUES
        ('room_1', 45.00, 35.00, 80.00),
        ('room_2', 47.00, 37.00, 85.00),
        ('room_3', 50.00, 40.00, 90.00),
        ('room_4', 52.00, 42.00, 95.00),
        ('room_5', 55.00, 45.00, 100.00),
        ('room_6', 57.00, 47.00, 105.00)
        ON CONFLICT (room_id) DO NOTHING;
      `;
      steps.push('✅ Configuración de precios inicializada');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Esquema de base de datos reparado correctamente',
      steps
    });
    
  } catch (error) {
    console.error('Error reparando esquema:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al reparar esquema: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
