import { sql } from '@vercel/postgres';

export interface MirComunicacion {
  id?: number;
  referencia: string;
  timestamp: string;
  datos: any;
  resultado?: any;
  estado: 'pendiente' | 'enviado' | 'confirmado' | 'error';
  lote?: string;
  error?: string;
  codigo_establecimiento: string;
  fecha_entrada: string;
  fecha_salida: string;
  num_personas: number;
  created_at?: string;
  updated_at?: string;
}

export async function insertMirComunicacion(comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO mir_comunicaciones (
        referencia, timestamp, datos, resultado, estado, lote, error,
        codigo_establecimiento, fecha_entrada, fecha_salida, num_personas
      ) VALUES (
        ${comunicacion.referencia},
        ${comunicacion.timestamp},
        ${JSON.stringify(comunicacion.datos)},
        ${comunicacion.resultado ? JSON.stringify(comunicacion.resultado) : null},
        ${comunicacion.estado},
        ${comunicacion.lote || null},
        ${comunicacion.error || null},
        ${comunicacion.codigo_establecimiento},
        ${comunicacion.fecha_entrada},
        ${comunicacion.fecha_salida},
        ${comunicacion.num_personas}
      ) RETURNING id
    `;
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error insertando comunicación MIR:', error);
    throw error;
  }
}

export async function updateMirComunicacion(
  referencia: string, 
  updates: Partial<Pick<MirComunicacion, 'resultado' | 'estado' | 'lote' | 'error'>>
): Promise<void> {
  try {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.resultado !== undefined) {
      setClause.push(`resultado = $${paramIndex}`);
      values.push(JSON.stringify(updates.resultado));
      paramIndex++;
    }
    
    if (updates.estado !== undefined) {
      setClause.push(`estado = $${paramIndex}`);
      values.push(updates.estado);
      paramIndex++;
    }
    
    if (updates.lote !== undefined) {
      setClause.push(`lote = $${paramIndex}`);
      values.push(updates.lote);
      paramIndex++;
    }
    
    if (updates.error !== undefined) {
      setClause.push(`error = $${paramIndex}`);
      values.push(updates.error);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return; // No hay nada que actualizar
    }

    values.push(referencia); // Para la condición WHERE

    await sql`
      UPDATE mir_comunicaciones 
      SET ${sql.unsafe(setClause.join(', '))}
      WHERE referencia = $${paramIndex}
    `;
  } catch (error) {
    console.error('Error actualizando comunicación MIR:', error);
    throw error;
  }
}

export async function getMirComunicaciones(estado?: string): Promise<MirComunicacion[]> {
  try {
    let query = 'SELECT * FROM mir_comunicaciones';
    const params = [];
    
    if (estado) {
      query += ' WHERE estado = $1';
      params.push(estado);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const result = await sql.unsafe(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      referencia: row.referencia,
      timestamp: row.timestamp,
      datos: row.datos,
      resultado: row.resultado,
      estado: row.estado,
      lote: row.lote,
      error: row.error,
      codigo_establecimiento: row.codigo_establecimiento,
      fecha_entrada: row.fecha_entrada,
      fecha_salida: row.fecha_salida,
      num_personas: row.num_personas,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
  } catch (error) {
    console.error('Error obteniendo comunicaciones MIR:', error);
    throw error;
  }
}

export async function getMirComunicacionByReferencia(referencia: string): Promise<MirComunicacion | null> {
  try {
    const result = await sql`
      SELECT * FROM mir_comunicaciones 
      WHERE referencia = ${referencia}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      referencia: row.referencia,
      timestamp: row.timestamp,
      datos: row.datos,
      resultado: row.resultado,
      estado: row.estado,
      lote: row.lote,
      error: row.error,
      codigo_establecimiento: row.codigo_establecimiento,
      fecha_entrada: row.fecha_entrada,
      fecha_salida: row.fecha_salida,
      num_personas: row.num_personas,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  } catch (error) {
    console.error('Error obteniendo comunicación MIR por referencia:', error);
    throw error;
  }
}

export async function getMirEstadisticas(): Promise<{
  total: number;
  pendientes: number;
  enviados: number;
  confirmados: number;
  errores: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'enviado') as enviados,
        COUNT(*) FILTER (WHERE estado = 'confirmado') as confirmados,
        COUNT(*) FILTER (WHERE estado = 'error') as errores
      FROM mir_comunicaciones
    `;
    
    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      pendientes: parseInt(row.pendientes),
      enviados: parseInt(row.enviados),
      confirmados: parseInt(row.confirmados),
      errores: parseInt(row.errores)
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas MIR:', error);
    throw error;
  }
}
