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
  
  // Crear placeholders para cada ID
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
  
  const result = await sql.query(
    `DELETE FROM guest_registrations WHERE id IN (${placeholders}) RETURNING id`,
    ids
  );
  
  return result.rows.length;
}

// ========================================
// FUNCIONES PARA RESERVAS (RESERVATIONS)
// ========================================

// Función helper para insertar una reserva
export async function insertReservation(data: {
  external_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string;
  check_in: string;
  check_out: string;
  channel: string;
  total_price: number;
  guest_paid?: number;
  platform_commission?: number;
  net_income?: number;
  currency?: string;
  status: string;
}): Promise<any> {
  const result = await sql`
    INSERT INTO reservations (
      external_id, room_id, guest_name, guest_email, 
      check_in, check_out, channel, total_price, 
      guest_paid, platform_commission, net_income, currency, status
    )
    VALUES (
      ${data.external_id}, ${data.room_id}, ${data.guest_name}, ${data.guest_email || ''}, 
      ${data.check_in}::timestamp, ${data.check_out}::timestamp, ${data.channel}, ${data.total_price}, 
      ${data.guest_paid || data.total_price}, ${data.platform_commission || 0}, ${data.net_income || data.total_price}, 
      ${data.currency || 'EUR'}, ${data.status}
    )
    RETURNING *;
  `;
  
  if (result.rows.length === 0) {
    throw new Error('Failed to insert reservation');
  }
  
  return result.rows[0];
}

// Función helper para obtener reservas con información de habitación
export async function getReservations(limit: number = 200): Promise<any[]> {
  const result = await sql`
    SELECT 
      r.*,
      rm.name as room_name
    FROM reservations r
    LEFT JOIN rooms rm ON rm.id = r.room_id
    ORDER BY r.check_in DESC
    LIMIT ${limit};
  `;
  
  return result.rows;
}

// Función helper para obtener reserva por ID
export async function getReservationById(id: string): Promise<any | null> {
  const result = await sql`
    SELECT 
      r.*,
      rm.name as room_name
    FROM reservations r
    LEFT JOIN rooms rm ON rm.id = r.room_id
    WHERE r.id = ${id};
  `;
  
  return result.rows[0] || null;
}

// Función helper para eliminar una reserva por ID
export async function deleteReservationById(id: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM reservations
    WHERE id = ${id}
    RETURNING id;
  `;
  
  return result.rows.length > 0;
}
