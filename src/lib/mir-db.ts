import { sql } from '@vercel/postgres';

export interface MirComunicacion {
  id?: number;
  referencia: string;
  tipo: 'PV' | 'RH' | 'AV' | 'RV';
  estado: 'pendiente' | 'enviado' | 'confirmado' | 'error' | 'anulado';
  lote?: string;
  resultado?: string;
  error?: string;
  xml_enviado?: string;
  xml_respuesta?: string;
  tenant_id?: string;
  created_at?: string;
  updated_at?: string;
}

export async function insertMirComunicacion(comunicacion: Omit<MirComunicacion, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO mir_comunicaciones (
        referencia, tipo, estado, lote, resultado, error, xml_enviado, xml_respuesta, tenant_id
      ) VALUES (
        ${comunicacion.referencia},
        ${comunicacion.tipo},
        ${comunicacion.estado},
        ${comunicacion.lote || null},
        ${comunicacion.resultado || null},
        ${comunicacion.error || null},
        ${comunicacion.xml_enviado || null},
        ${comunicacion.xml_respuesta || null},
        ${comunicacion.tenant_id || null}
      )
      ON CONFLICT (referencia) DO UPDATE SET
        tipo = EXCLUDED.tipo,
        estado = EXCLUDED.estado,
        lote = EXCLUDED.lote,
        resultado = EXCLUDED.resultado,
        error = EXCLUDED.error,
        xml_enviado = EXCLUDED.xml_enviado,
        xml_respuesta = EXCLUDED.xml_respuesta,
        tenant_id = COALESCE(EXCLUDED.tenant_id, mir_comunicaciones.tenant_id),
        updated_at = NOW()
      RETURNING id
    `;
    
    return result.rows[0].id;
  } catch (error) {
    console.error('Error insertando comunicación MIR:', error);
    throw error;
  }
}

export async function updateMirComunicacion(
  referencia: string, 
  updates: Partial<Pick<MirComunicacion, 'resultado' | 'estado' | 'lote' | 'error' | 'xml_respuesta'>>
): Promise<void> {
  try {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.resultado !== undefined) {
      setClause.push(`resultado = $${paramIndex}`);
      values.push(updates.resultado);
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

    if (updates.xml_respuesta !== undefined) {
      setClause.push(`xml_respuesta = $${paramIndex}`);
      values.push(updates.xml_respuesta);
      paramIndex++;
    }

    if (setClause.length === 0) {
      return; // No hay nada que actualizar
    }

    values.push(referencia); // Para la condición WHERE

    const updateQuery = `
      UPDATE mir_comunicaciones 
      SET ${setClause.join(', ')}
      WHERE referencia = $${paramIndex}
    `;
    
    await sql.unsafe(updateQuery, values);
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
    
    query += ' ORDER BY created_at DESC';
    
    const result = await sql.unsafe(query, params);
    
    return result.rows.map(row => ({
      id: row.id,
      referencia: row.referencia,
      tipo: row.tipo,
      estado: row.estado,
      lote: row.lote,
      resultado: row.resultado,
      error: row.error,
      xml_enviado: row.xml_enviado,
      xml_respuesta: row.xml_respuesta,
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
      tipo: row.tipo,
      estado: row.estado,
      lote: row.lote,
      resultado: row.resultado,
      error: row.error,
      xml_enviado: row.xml_enviado,
      xml_respuesta: row.xml_respuesta,
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
  anulados: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
        COUNT(*) FILTER (WHERE estado = 'enviado') as enviados,
        COUNT(*) FILTER (WHERE estado = 'confirmado') as confirmados,
        COUNT(*) FILTER (WHERE estado = 'error') as errores,
        COUNT(*) FILTER (WHERE estado = 'anulado') as anulados
      FROM mir_comunicaciones
    `;
    
    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      pendientes: parseInt(row.pendientes),
      enviados: parseInt(row.enviados),
      confirmados: parseInt(row.confirmados),
      errores: parseInt(row.errores),
      anulados: parseInt(row.anulados)
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas MIR:', error);
    throw error;
  }
}
