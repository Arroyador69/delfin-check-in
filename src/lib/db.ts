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

// Función helper para extraer el número de habitación del room_id
export function getRoomNumber(roomId: string | null | undefined): string {
  if (!roomId) return 'N/A';
  
  // Si es un número simple, devolverlo tal como está
  if (/^\d+$/.test(roomId)) {
    return roomId;
  }
  
  // Si es un UUID, intentar extraer el número de habitación
  // Los UUIDs pueden contener el número de habitación al final
  if (roomId.includes('room-')) {
    const match = roomId.match(/room-(\d+)/);
    if (match) {
      return match[1];
    }
  }
  
  // Si es un UUID largo, intentar extraer números del final
  const numbers = roomId.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    // Tomar el último número encontrado (probablemente el número de habitación)
    const lastNumber = numbers[numbers.length - 1];
    // Si el número es muy largo, tomar solo los últimos dígitos
    return lastNumber.length > 2 ? lastNumber.slice(-2) : lastNumber;
  }
  
  // Si no se puede extraer un número, devolver el ID truncado
  return roomId.length > 8 ? roomId.slice(0, 8) + '...' : roomId;
}

// Función para normalizar room_id a números simples (1-6) - SOLO cuando sea necesario
export function normalizeRoomId(roomId: string | null | undefined): string {
  if (!roomId) return '1'; // Default a habitación 1
  
  // Si ya es un número simple válido (1-6), devolverlo SIN CAMBIOS
  if (/^[1-6]$/.test(roomId)) {
    return roomId; // ← NO TOCAR números válidos
  }
  
  // Si es un número pero fuera del rango, normalizar
  if (/^\d+$/.test(roomId)) {
    const num = parseInt(roomId);
    if (num >= 1 && num <= 6) {
      return roomId; // ← NO TOCAR números válidos
    }
    // Solo normalizar si está fuera del rango 1-6
    return ((num - 1) % 6 + 1).toString();
  }
  
  // Solo normalizar UUIDs, timestamps y strings complejos
  // Si contiene "room-" seguido de número
  if (roomId.includes('room-')) {
    const match = roomId.match(/room-(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      return ((num - 1) % 6 + 1).toString();
    }
  }
  
  // Si es un UUID o string complejo (más de 10 caracteres), extraer números
  if (roomId.length > 10) {
    const numbers = roomId.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      const lastNumber = numbers[numbers.length - 1];
      const num = parseInt(lastNumber);
      return ((num - 1) % 6 + 1).toString();
    }
    
    // Si no se puede extraer nada, usar hash del string para obtener 1-6
    let hash = 0;
    for (let i = 0; i < roomId.length; i++) {
      hash = ((hash << 5) - hash + roomId.charCodeAt(i)) & 0xffffffff;
    }
    return (Math.abs(hash) % 6 + 1).toString();
  }
  
  // Si es un string corto que no reconocemos, devolverlo tal como está
  return roomId;
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
  guest_phone?: string;
  guest_count?: number;
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
      external_id, room_id, guest_name, guest_email, guest_phone, guest_count,
      check_in, check_out, channel, total_price, 
      guest_paid, platform_commission, net_income, currency, status
    )
    VALUES (
      ${data.external_id}, ${data.room_id}, ${data.guest_name}, ${data.guest_email || ''}, ${data.guest_phone || ''}, ${data.guest_count || 1}, 
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

// Función helper para obtener reservas (sin JOIN con rooms por ahora)
export async function getReservations(limit: number = 200): Promise<any[]> {
  const result = await sql`
    SELECT 
      r.*
    FROM reservations r
    ORDER BY r.check_in DESC
    LIMIT ${limit};
  `;
  
  return result.rows;
}

// ========================================
// FUNCIONES PARA MENSAJES DE WHATSAPP
// ========================================

// Función para obtener plantillas de mensajes
export async function getMessageTemplates(): Promise<any[]> {
  const result = await sql`
    SELECT * FROM message_templates 
    ORDER BY created_at ASC
  `;
  return result.rows;
}

// Función para obtener plantilla por ID
export async function getMessageTemplate(id: number): Promise<any> {
  const result = await sql`
    SELECT * FROM message_templates 
    WHERE id = ${id}
  `;
  return result.rows[0];
}

// Función para crear o actualizar plantilla
export async function upsertMessageTemplate(data: {
  id?: number;
  name: string;
  trigger_type: string;
  channel: string;
  language: string;
  template_content: string;
  variables: string[];
  is_active: boolean;
}): Promise<any> {
  if (data.id) {
    // Actualizar
    const result = await sql`
      UPDATE message_templates 
      SET name = ${data.name},
          trigger_type = ${data.trigger_type},
          channel = ${data.channel},
          language = ${data.language},
          template_content = ${data.template_content},
          variables = ${JSON.stringify(data.variables)}::jsonb,
          is_active = ${data.is_active},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${data.id}
      RETURNING *;
    `;
    return result.rows[0];
  } else {
    // Insertar
    const result = await sql`
      INSERT INTO message_templates (
        name, trigger_type, channel, language, template_content, variables, is_active
      )
      VALUES (
        ${data.name}, ${data.trigger_type}, ${data.channel}, ${data.language}, 
        ${data.template_content}, ${JSON.stringify(data.variables)}::jsonb, ${data.is_active}
      )
      RETURNING *;
    `;
    return result.rows[0];
  }
}

// Función para eliminar plantilla
export async function deleteMessageTemplate(id: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM message_templates 
    WHERE id = ${id}
  `;
  return (result.rowCount ?? 0) > 0;
}

// Función para registrar mensaje enviado
export async function insertSentMessage(data: {
  template_id: number;
  reservation_id?: number;
  guest_phone: string;
  guest_name?: string;
  message_content: string;
  whatsapp_message_id?: string;
  status: string;
  error_message?: string;
}): Promise<any> {
  const result = await sql`
    INSERT INTO sent_messages (
      template_id, reservation_id, guest_phone, guest_name, 
      message_content, whatsapp_message_id, status, error_message
    )
    VALUES (
      ${data.template_id}, ${data.reservation_id || null}, ${data.guest_phone}, 
      ${data.guest_name || ''}, ${data.message_content}, ${data.whatsapp_message_id || null}, 
      ${data.status}, ${data.error_message || null}
    )
    RETURNING *;
  `;
  return result.rows[0];
}

// Función para actualizar estado de mensaje enviado
export async function updateSentMessageStatus(
  id: number, 
  status: string, 
  whatsapp_message_id?: string,
  error_message?: string
): Promise<any> {
  const result = await sql`
    UPDATE sent_messages 
    SET status = ${status},
        whatsapp_message_id = COALESCE(${whatsapp_message_id || null}, whatsapp_message_id),
        sent_at = CASE WHEN ${status} = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END,
        delivered_at = CASE WHEN ${status} = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END,
        read_at = CASE WHEN ${status} = 'read' THEN CURRENT_TIMESTAMP ELSE read_at END,
        error_message = COALESCE(${error_message || null}, error_message)
    WHERE id = ${id}
    RETURNING *;
  `;
  return result.rows[0];
}

// Función para obtener mensajes enviados
export async function getSentMessages(limit: number = 100): Promise<any[]> {
  const result = await sql`
    SELECT sm.*, mt.name as template_name, mt.trigger_type
    FROM sent_messages sm
    LEFT JOIN message_templates mt ON sm.template_id = mt.id
    ORDER BY sm.created_at DESC 
    LIMIT ${limit}
  `;
  return result.rows;
}

// Función para obtener configuración de WhatsApp
export async function getWhatsAppConfig(): Promise<any> {
  const result = await sql`
    SELECT * FROM whatsapp_config 
    WHERE is_active = true 
    LIMIT 1
  `;
  return result.rows[0];
}

// Función para actualizar configuración de WhatsApp
export async function updateWhatsAppConfig(data: {
  phone_number?: string;
  access_token?: string;
  webhook_verify_token?: string;
  is_active?: boolean;
}): Promise<any> {
  const result = await sql`
    UPDATE whatsapp_config 
    SET phone_number = COALESCE(${data.phone_number || null}, phone_number),
        access_token = COALESCE(${data.access_token || null}, access_token),
        webhook_verify_token = COALESCE(${data.webhook_verify_token || null}, webhook_verify_token),
        is_active = COALESCE(${data.is_active || null}, is_active),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
    RETURNING *;
  `;
  return result.rows[0];
}

// Función helper para obtener reserva por ID (sin JOIN con rooms por ahora)
export async function getReservationById(id: string): Promise<any | null> {
  const result = await sql`
    SELECT 
      r.*
    FROM reservations r
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
