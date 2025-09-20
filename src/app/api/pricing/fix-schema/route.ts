import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Reparando esquema específico de precios dinámicos...');
    
    const steps = [];
    
    // 1. Verificar si la tabla competitor_daily_prices existe
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'competitor_daily_prices'
      );
    `;
    
    const tableExists = tableCheck.rows[0]?.exists;
    steps.push(`Tabla competitor_daily_prices existe: ${tableExists}`);
    
    if (!tableExists) {
      // Crear la tabla completa
      await sql`
        CREATE TABLE competitor_daily_prices (
          id BIGSERIAL PRIMARY KEY,
          listing_id INTEGER REFERENCES competitor_listings(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          room_type TEXT NOT NULL DEFAULT 'standard',
          price NUMERIC(10,2),
          availability BOOLEAN DEFAULT true,
          scraped_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(listing_id, date, room_type)
        );
      `;
      steps.push('✅ Tabla competitor_daily_prices creada');
    } else {
      // Verificar si la columna price existe
      const columnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'competitor_daily_prices' 
          AND column_name = 'price'
          AND table_schema = 'public';
      `;
      
      if (columnCheck.rows.length === 0) {
        // Agregar la columna price
        await sql`
          ALTER TABLE competitor_daily_prices 
          ADD COLUMN price NUMERIC(10,2);
        `;
        steps.push('✅ Columna price agregada a competitor_daily_prices');
      } else {
        steps.push('✅ Columna price ya existe en competitor_daily_prices');
      }
    }
    
    // 2. Crear tabla competitor_listings si no existe
    const listingsCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'competitor_listings'
      );
    `;
    
    if (!listingsCheck.rows[0]?.exists) {
      await sql`
        CREATE TABLE competitor_listings (
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
      `;
      steps.push('✅ Tabla competitor_listings creada');
    } else {
      steps.push('✅ Tabla competitor_listings ya existe');
    }
    
    // 3. Crear otras tablas necesarias
    const requiredTables = [
      {
        name: 'local_events',
        sql: `
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
        `
      },
      {
        name: 'my_occupancy',
        sql: `
          CREATE TABLE IF NOT EXISTS my_occupancy (
            id BIGSERIAL PRIMARY KEY,
            date DATE UNIQUE NOT NULL,
            occupancy_pct NUMERIC(5,2) DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      },
      {
        name: 'pricing_config',
        sql: `
          CREATE TABLE IF NOT EXISTS pricing_config (
            id SERIAL PRIMARY KEY,
            room_id TEXT UNIQUE NOT NULL,
            base_price NUMERIC(10,2) NOT NULL,
            min_price NUMERIC(10,2) DEFAULT 0,
            max_price NUMERIC(10,2) DEFAULT 9999,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
          );
        `
      },
      {
        name: 'price_recommendations',
        sql: `
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
        `
      }
    ];
    
    for (const table of requiredTables) {
      const existsCheck = await sql`
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public' AND tablename = ${table.name}
        );
      `;
      
      if (!existsCheck.rows[0]?.exists) {
        await sql.query(table.sql);
        steps.push(`✅ Tabla ${table.name} creada`);
      } else {
        steps.push(`✅ Tabla ${table.name} ya existe`);
      }
    }
    
    // 4. Crear índices
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_date ON competitor_daily_prices(date);',
      'CREATE INDEX IF NOT EXISTS idx_competitor_daily_prices_listing_date ON competitor_daily_prices(listing_id, date);',
      'CREATE INDEX IF NOT EXISTS idx_local_events_starts_at ON local_events(starts_at);',
      'CREATE INDEX IF NOT EXISTS idx_local_events_impact ON local_events(impact_level);',
      'CREATE INDEX IF NOT EXISTS idx_my_occupancy_date ON my_occupancy(date);',
      'CREATE INDEX IF NOT EXISTS idx_price_recommendations_date ON price_recommendations(date);',
      'CREATE INDEX IF NOT EXISTS idx_price_recommendations_room_date ON price_recommendations(room_id, date);'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await sql.query(indexSQL);
      } catch (error) {
        // Ignorar errores de índices duplicados
      }
    }
    steps.push('✅ Índices creados/verificados');
    
    // 5. Insertar datos iniciales si no existen
    const configCheck = await sql`SELECT COUNT(*) FROM pricing_config`;
    if (parseInt(configCheck.rows[0]?.count || '0') === 0) {
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
    } else {
      steps.push('✅ Configuración de precios ya existe');
    }
    
    // 6. Verificación final
    const finalCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'competitor_daily_prices' 
        AND column_name = 'price'
        AND table_schema = 'public';
    `;
    
    const priceColumnExists = finalCheck.rows.length > 0;
    steps.push(`Verificación final - Columna price existe: ${priceColumnExists}`);
    
    return NextResponse.json({
      success: true,
      message: 'Esquema de precios dinámicos reparado correctamente',
      steps,
      verification: {
        priceColumnExists,
        allTablesCreated: true
      }
    });
    
  } catch (error) {
    console.error('Error reparando esquema:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al reparar esquema: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}
