import { sql } from "@vercel/postgres";

// Re-export directo de Vercel Postgres
// Vercel inyecta automáticamente las credenciales desde POSTGRES_URL
export { sql };

// Función helper para manejar errores de base de datos
export async function executeQuery<T = any>(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  try {
    const result = await sql(query, ...values);
    return result.rows as T[];
  } catch (error) {
    console.error('Database error:', error);
    throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Función helper para insertar un registro
export async function insertGuestRegistration(data: {
  reserva_ref?: string;
  fecha_entrada: string;
  fecha_salida: string;
  data: any;
}): Promise<string> {
  const result = await sql`
    INSERT INTO guest_registrations (reserva_ref, fecha_entrada, fecha_salida, data)
    VALUES (${data.reserva_ref}, ${data.fecha_entrada}, ${data.fecha_salida}, ${JSON.stringify(data.data)}::jsonb)
    RETURNING id;
  `;
  
  if (result.rows.length === 0) {
    throw new Error('Failed to insert guest registration');
  }
  
  return result.rows[0].id;
}

// Función helper para obtener registros
export async function getGuestRegistrations(limit: number = 200): Promise<any[]> {
  const result = await sql`
    SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at
    FROM guest_registrations
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;
  
  return result.rows;
}

// Función helper para obtener registro por ID
export async function getGuestRegistrationById(id: string): Promise<any | null> {
  const result = await sql`
    SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at
    FROM guest_registrations
    WHERE id = ${id};
  `;
  
  return result.rows[0] || null;
}

// Función helper para eliminar un registro por ID
export async function deleteGuestRegistrationById(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM guest_registrations
    WHERE id = ${id}
    RETURNING id;
  `;
  
  return result.rows.length > 0;
}

// Función helper para eliminar múltiples registros por IDs
export async function deleteGuestRegistrationsByIds(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  
  const result = await sql`
    DELETE FROM guest_registrations
    WHERE id = ANY(${ids})
    RETURNING id;
  `;
  
  return result.rows.length;
}
