import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Configurando tablas MIR en Neon Database...');

    // Verificar que estamos conectados a Neon
    const connectionTest = await sql`SELECT current_database(), current_user, version()`;
    console.log('✅ Conectado a Neon Database:', {
      database: connectionTest.rows[0].current_database,
      user: connectionTest.rows[0].current_user,
      version: connectionTest.rows[0].version
    });

    // Crear tabla mir_comunicaciones con la estructura correcta
    await sql`
      CREATE TABLE IF NOT EXISTS mir_comunicaciones (
        id SERIAL PRIMARY KEY,
        referencia VARCHAR(255) UNIQUE NOT NULL,
        tipo VARCHAR(10) DEFAULT 'PV',
        estado VARCHAR(50) DEFAULT 'pendiente',
        lote VARCHAR(255),
        resultado TEXT,
        error TEXT,
        xml_enviado TEXT,
        xml_respuesta TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crear índices para optimizar consultas
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_estado ON mir_comunicaciones(estado)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_referencia ON mir_comunicaciones(referencia)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_lote ON mir_comunicaciones(lote)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_created_at ON mir_comunicaciones(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_comunicaciones_tipo ON mir_comunicaciones(tipo)`;

    // Crear función para actualizar updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_mir_comunicaciones_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // Crear trigger
    await sql`
      DROP TRIGGER IF EXISTS update_mir_comunicaciones_updated_at ON mir_comunicaciones
    `;
    await sql`
      CREATE TRIGGER update_mir_comunicaciones_updated_at
          BEFORE UPDATE ON mir_comunicaciones
          FOR EACH ROW
          EXECUTE FUNCTION update_mir_comunicaciones_updated_at()
    `;

    // Crear tabla mir_configuraciones para sistema multitenant
    await sql`
      CREATE TABLE IF NOT EXISTS mir_configuraciones (
        id SERIAL PRIMARY KEY,
        propietario_id VARCHAR(255) NOT NULL UNIQUE,
        usuario VARCHAR(255) NOT NULL,
        contraseña VARCHAR(255) NOT NULL,
        codigo_arrendador VARCHAR(255) NOT NULL,
        base_url VARCHAR(500) NOT NULL DEFAULT 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
        aplicacion VARCHAR(100) NOT NULL DEFAULT 'Delfin_Check_in',
        simulacion BOOLEAN NOT NULL DEFAULT false,
        activo BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Crear índices para mir_configuraciones
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_propietario_id ON mir_configuraciones(propietario_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_mir_configuraciones_activo ON mir_configuraciones(activo)`;

    // Crear función para actualizar updated_at en mir_configuraciones
    await sql`
      CREATE OR REPLACE FUNCTION update_mir_configuraciones_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // Crear trigger para mir_configuraciones
    await sql`
      DROP TRIGGER IF EXISTS update_mir_configuraciones_updated_at ON mir_configuraciones
    `;
    await sql`
      CREATE TRIGGER update_mir_configuraciones_updated_at
          BEFORE UPDATE ON mir_configuraciones
          FOR EACH ROW
          EXECUTE FUNCTION update_mir_configuraciones_updated_at()
    `;

    // Verificar que las tablas se crearon correctamente
    const tablesResult = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('mir_comunicaciones', 'mir_configuraciones')
      ORDER BY table_name, ordinal_position
    `;

    // Verificar índices
    const indexesResult = await sql`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes 
      WHERE tablename IN ('mir_comunicaciones', 'mir_configuraciones')
      ORDER BY tablename, indexname
    `;

    console.log('✅ Tablas MIR configuradas correctamente en Neon Database');

    return NextResponse.json({
      success: true,
      message: 'Tablas MIR configuradas correctamente en Neon Database',
      database: connectionTest.rows[0].current_database,
      tables: tablesResult.rows,
      indexes: indexesResult.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error configurando tablas MIR en Neon:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error configurando tablas MIR en Neon Database',
      message: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estado de tablas MIR en Neon Database...');

    // Verificar conexión
    const connectionTest = await sql`SELECT current_database(), current_user, version()`;
    
    // Verificar tablas
    const tablesResult = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name IN ('mir_comunicaciones', 'mir_configuraciones')
      ORDER BY table_name, ordinal_position
    `;

    // Verificar índices
    const indexesResult = await sql`
      SELECT indexname, tablename, indexdef
      FROM pg_indexes 
      WHERE tablename IN ('mir_comunicaciones', 'mir_configuraciones')
      ORDER BY tablename, indexname
    `;

    // Verificar triggers
    const triggersResult = await sql`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE event_object_table IN ('mir_comunicaciones', 'mir_configuraciones')
      ORDER BY event_object_table, trigger_name
    `;

    // Contar registros
    const countResult = await sql`
      SELECT 
        (SELECT COUNT(*) FROM mir_comunicaciones) as mir_comunicaciones_count,
        (SELECT COUNT(*) FROM mir_configuraciones) as mir_configuraciones_count
    `;

    return NextResponse.json({
      success: true,
      message: 'Estado de tablas MIR en Neon Database',
      database: connectionTest.rows[0].current_database,
      user: connectionTest.rows[0].current_user,
      version: connectionTest.rows[0].version,
      tables: tablesResult.rows,
      indexes: indexesResult.rows,
      triggers: triggersResult.rows,
      counts: countResult.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error verificando estado de tablas MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error verificando estado de tablas MIR en Neon Database',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
