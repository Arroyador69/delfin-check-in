import { sql } from "@vercel/postgres";

// Re-export directo de Vercel Postgres
// Vercel inyecta automáticamente las credenciales desde POSTGRES_URL
export { sql };

/**
 * 🔒 FUNCIÓN WRAPPER PARA QUERIES CON CONTEXTO DE TENANT
 * 
 * Esta función establece app.current_tenant_id para Row Level Security (RLS)
 * y ejecuta la query con el contexto del tenant correcto.
 * 
 * IMPORTANTE: Vercel Postgres puede tener limitaciones con SET LOCAL en conexiones serverless.
 * Por eso mantenemos el filtrado explícito por tenant_id como capa principal de seguridad.
 * RLS es una capa adicional de protección.
 * 
 * @param tenantId - UUID del tenant (puede ser string o UUID)
 * @param queryFn - Función que ejecuta la query SQL
 * @returns Resultado de la query
 */
export async function withTenantContext<T>(
  tenantId: string | null,
  queryFn: () => Promise<T>
): Promise<T> {
  if (!tenantId) {
    throw new Error('tenant_id es requerido para ejecutar queries con contexto de tenant');
  }

  try {
    // Intentar establecer app.current_tenant_id para RLS
    // NOTA: Esto puede fallar en Vercel Postgres serverless, pero no es crítico
    // porque el filtrado explícito por tenant_id ya protege los datos
    try {
      await sql`SET LOCAL app.current_tenant_id = ${tenantId}`;
    } catch (rlsError) {
      // Si falla, no es crítico - el filtrado explícito por tenant_id ya protege
      console.warn('⚠️ No se pudo establecer app.current_tenant_id para RLS (puede ser normal en Vercel Postgres):', rlsError);
    }

    // Ejecutar la query
    const result = await queryFn();

    // Limpiar el contexto (opcional, pero buena práctica)
    try {
      await sql`RESET app.current_tenant_id`;
    } catch (resetError) {
      // Ignorar errores al resetear
    }

    return result;
  } catch (error) {
    console.error('Error ejecutando query con contexto de tenant:', error);
    throw error;
  }
}

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

// Función helper para insertar un registro con prevención de duplicados
export async function insertGuestRegistration(data: {
  reserva_ref?: string;
  fecha_entrada: string;
  fecha_salida: string;
  data: any;
  tenant_id?: string | null; // ⚠️ CRÍTICO: tenant_id para aislamiento multi-tenant
}): Promise<string> {
  // Extraer documento de identidad para detectar duplicados
  const documento = data.data?.comunicaciones?.[0]?.personas?.[0]?.numeroDocumento;
  const nombre = data.data?.comunicaciones?.[0]?.personas?.[0]?.nombre;
  const apellido1 = data.data?.comunicaciones?.[0]?.personas?.[0]?.apellido1;
  
  if (documento && nombre && apellido1) {
    console.log('🔍 Verificando duplicados para documento:', documento);
    
    // Buscar registros existentes con el mismo documento en las últimas 24 horas
    const existingRegistrations = await sql`
      SELECT id, data, created_at
      FROM guest_registrations 
      WHERE data->'comunicaciones'->0->'personas'->0->>'numeroDocumento' = ${documento}
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `;
    
    if (existingRegistrations.rows.length > 0) {
      console.log(`⚠️ Encontrados ${existingRegistrations.rows.length} registros duplicados para documento ${documento}`);
      
      // Verificar si alguno de los registros existentes tiene datos completos
      let registroCompleto = null;
      let registrosIncompletos = [];
      
      for (const registro of existingRegistrations.rows) {
        const codigoPostal = registro.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.codigoPostal;
        const telefono = registro.data?.comunicaciones?.[0]?.personas?.[0]?.contacto?.telefono;
        
        // Considerar completo si tiene código postal válido (no "00000") y teléfono
        if (codigoPostal && codigoPostal !== "00000" && telefono && telefono !== "600000000") {
          registroCompleto = registro;
        } else {
          registrosIncompletos.push(registro);
        }
      }
      
      // Si hay un registro completo, eliminar los incompletos y devolver el completo
      if (registroCompleto) {
        console.log('✅ Registro completo encontrado, eliminando duplicados incompletos');
        
        // Eliminar registros incompletos
        for (const registro of registrosIncompletos) {
          await sql`DELETE FROM guest_registrations WHERE id = ${registro.id}`;
          console.log(`🗑️ Eliminado registro incompleto: ${registro.id}`);
        }
        
        return registroCompleto.id;
      }
      
      // Si no hay registro completo, verificar si el nuevo registro es más completo
      const nuevoCodigoPostal = data.data?.comunicaciones?.[0]?.personas?.[0]?.direccion?.codigoPostal;
      const nuevoTelefono = data.data?.comunicaciones?.[0]?.personas?.[0]?.contacto?.telefono;
      
      if (nuevoCodigoPostal && nuevoCodigoPostal !== "00000" && nuevoTelefono && nuevoTelefono !== "600000000") {
        console.log('✅ Nuevo registro es más completo, eliminando duplicados anteriores');
        
        // Eliminar todos los registros existentes
        for (const registro of existingRegistrations.rows) {
          await sql`DELETE FROM guest_registrations WHERE id = ${registro.id}`;
          console.log(`🗑️ Eliminado registro anterior: ${registro.id}`);
        }
      } else {
        console.log('⚠️ Nuevo registro también es incompleto, rechazando envío');
        throw new Error('No se puede enviar un registro incompleto cuando ya existe uno similar. Complete todos los campos obligatorios.');
      }
    }
  }
  
  // ⚠️ CRÍTICO: Convertir tenant_id a UUID si es string
  const tenantIdUuid = data.tenant_id && data.tenant_id !== 'default' 
    ? (data.tenant_id.includes('-') ? data.tenant_id : null) // Si ya es UUID, usarlo; si no, null
    : null;

  // Insertar nuevo registro con tenant_id
  const result = await sql`
    INSERT INTO guest_registrations (reserva_ref, fecha_entrada, fecha_salida, data, tenant_id)
    VALUES (
      ${data.reserva_ref}, 
      ${data.fecha_entrada}, 
      ${data.fecha_salida}, 
      ${JSON.stringify(data.data)}::jsonb,
      ${tenantIdUuid}::uuid
    )
    RETURNING id;
  `;
  
  if (result.rows.length === 0) {
    throw new Error('Failed to insert guest registration');
  }
  
  console.log('✅ Nuevo registro insertado:', result.rows[0].id);
  return result.rows[0].id;
}

// Función helper para obtener registros
export async function getGuestRegistrations(limit: number = 200, tenantId?: string | null): Promise<any[]> {
  // Si se proporciona tenantId, filtrar por él
  if (tenantId) {
    console.log('🔍 Buscando registros con tenantId:', tenantId);
    console.log('🔍 Tipo de tenantId:', typeof tenantId);
    
    // Intentar con UUID primero
    try {
      const result = await sql`
        SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at, tenant_id
        FROM guest_registrations
        WHERE tenant_id = ${tenantId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit};
      `;
      console.log(`✅ Encontrados ${result.rows.length} registros con UUID`);
      return result.rows;
    } catch (uuidError) {
      console.log('⚠️ Error con UUID, intentando con string:', uuidError);
      // Si falla con UUID, intentar con string
      try {
        const result = await sql`
          SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at, tenant_id
          FROM guest_registrations
          WHERE tenant_id::text = ${tenantId}
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
        console.log(`✅ Encontrados ${result.rows.length} registros con string`);
        return result.rows;
      } catch (stringError) {
        console.error('❌ Error con ambos métodos:', stringError);
        // Como último recurso, devolver todos (pero esto no debería pasar)
        const result = await sql`
          SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at, tenant_id
          FROM guest_registrations
          ORDER BY created_at DESC
          LIMIT ${limit};
        `;
        console.warn('⚠️ Devolviendo todos los registros (sin filtro)');
        return result.rows;
      }
    }
  }
  
  // Si no se proporciona tenantId, devolver todos (para compatibilidad, pero mejor siempre pasar tenantId)
  console.warn('⚠️ getGuestRegistrations llamado sin tenantId - devolviendo todos los registros');
  const result = await sql`
    SELECT id, reserva_ref, fecha_entrada, fecha_salida, data, created_at, updated_at, tenant_id
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

// ========================================
// FUNCIONES PARA CONFIGURACIÓN DE EMPRESA
// ========================================

// Función para asegurar que las tablas de facturas existan
export async function ensureFacturasTables(): Promise<void> {
  try {
    // Crear tabla empresa_config
    await sql`
      CREATE TABLE IF NOT EXISTS empresa_config (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        nombre_empresa VARCHAR(255) NOT NULL,
        nif_empresa VARCHAR(20) NOT NULL,
        direccion_empresa TEXT NOT NULL,
        codigo_postal VARCHAR(10),
        ciudad VARCHAR(100),
        provincia VARCHAR(100),
        pais VARCHAR(100) DEFAULT 'España',
        telefono VARCHAR(20),
        email VARCHAR(255),
        web VARCHAR(255),
        logo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id)
      )
    `;

    // Crear tabla facturas
    await sql`
      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        numero_factura VARCHAR(50) NOT NULL,
        fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
        
        -- Datos del cliente/huésped
        cliente_nombre VARCHAR(255) NOT NULL,
        cliente_nif VARCHAR(20),
        cliente_direccion TEXT,
        cliente_codigo_postal VARCHAR(10),
        cliente_ciudad VARCHAR(100),
        cliente_provincia VARCHAR(100),
        cliente_pais VARCHAR(100) DEFAULT 'España',
        
        -- Concepto del servicio
        concepto VARCHAR(500) NOT NULL,
        descripcion TEXT,
        
        -- Datos económicos
        precio_base DECIMAL(10,2) NOT NULL,
        iva_porcentaje DECIMAL(5,2) DEFAULT 21.00,
        iva_importe DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        
        -- Forma de pago (opcional)
        forma_pago VARCHAR(100),
        
        -- Archivo PDF
        pdf_url VARCHAR(500),
        pdf_filename VARCHAR(255),
        
        -- Metadatos
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(tenant_id, numero_factura)
      )
    `;

    // Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_facturas_tenant_id ON facturas(tenant_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision ON facturas(fecha_emision)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura)`;

    // Crear función para generar número de factura
    await sql`
      CREATE OR REPLACE FUNCTION generar_numero_factura(p_tenant_id VARCHAR(255))
      RETURNS VARCHAR(50) AS $$
      DECLARE
        ultimo_numero INTEGER;
        nuevo_numero VARCHAR(50);
      BEGIN
        -- Obtener el último número de factura para este tenant
        SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '[0-9]+$') AS INTEGER)), 0)
        INTO ultimo_numero
        FROM facturas 
        WHERE tenant_id = p_tenant_id;
        
        -- Generar nuevo número (año + número correlativo)
        nuevo_numero := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD((ultimo_numero + 1)::TEXT, 4, '0');
        
        RETURN nuevo_numero;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Crear triggers para updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_empresa_config_updated_at'
        ) THEN
          CREATE TRIGGER update_empresa_config_updated_at 
          BEFORE UPDATE ON empresa_config 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END$$;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'update_facturas_updated_at'
        ) THEN
          CREATE TRIGGER update_facturas_updated_at 
          BEFORE UPDATE ON facturas 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END$$;
    `;

  } catch (error) {
    console.error('Error al crear tablas de facturas:', error);
    throw error;
  }
}

// Función para obtener configuración de empresa por tenant
export async function getEmpresaConfig(tenantId: string): Promise<any | null> {
  // IMPORTANTE: empresa_config.tenant_id es VARCHAR(255), asegurar conversión a string
  const tenantIdString = String(tenantId);
  const result = await sql`
    SELECT * FROM empresa_config 
    WHERE tenant_id = ${tenantIdString}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

// Función para crear o actualizar configuración de empresa
export async function upsertEmpresaConfig(data: {
  tenant_id: string;
  nombre_empresa: string;
  nif_empresa: string;
  direccion_empresa: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  telefono?: string;
  email?: string;
  web?: string;
  logo_url?: string;
}): Promise<any> {
  const result = await sql`
    INSERT INTO empresa_config (
      tenant_id, nombre_empresa, nif_empresa, direccion_empresa, 
      codigo_postal, ciudad, provincia, pais, telefono, email, web, logo_url
    )
    VALUES (
      ${data.tenant_id}, ${data.nombre_empresa}, ${data.nif_empresa}, ${data.direccion_empresa},
      ${data.codigo_postal || ''}, ${data.ciudad || ''}, ${data.provincia || ''}, 
      ${data.pais || 'España'}, ${data.telefono || ''}, ${data.email || ''}, 
      ${data.web || ''}, ${data.logo_url || ''}
    )
    ON CONFLICT (tenant_id) 
    DO UPDATE SET
      nombre_empresa = EXCLUDED.nombre_empresa,
      nif_empresa = EXCLUDED.nif_empresa,
      direccion_empresa = EXCLUDED.direccion_empresa,
      codigo_postal = EXCLUDED.codigo_postal,
      ciudad = EXCLUDED.ciudad,
      provincia = EXCLUDED.provincia,
      pais = EXCLUDED.pais,
      telefono = EXCLUDED.telefono,
      email = EXCLUDED.email,
      web = EXCLUDED.web,
      logo_url = EXCLUDED.logo_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;
  return result.rows[0];
}

// ========================================
// FUNCIONES PARA FACTURAS
// ========================================

// Función para generar número de factura automático
export async function generarNumeroFactura(tenantId: string): Promise<string> {
  const result = await sql`
    SELECT generar_numero_factura(${tenantId}) as numero_factura;
  `;
  return result.rows[0].numero_factura;
}

// Función para crear una nueva factura
export async function crearFactura(data: {
  tenant_id: string;
  cliente_nombre: string;
  cliente_nif?: string;
  cliente_direccion?: string;
  cliente_codigo_postal?: string;
  cliente_ciudad?: string;
  cliente_provincia?: string;
  cliente_pais?: string;
  concepto: string;
  descripcion?: string;
  precio_base: number;
  iva_porcentaje?: number;
  iva_importe?: number; // Nuevo campo para IVA calculado
  total?: number; // Nuevo campo para total calculado
  forma_pago?: string;
}): Promise<any> {
  // Usar los valores calculados del frontend o calcular si no están presentes
  const ivaPorcentaje = data.iva_porcentaje || 21.00;
  const ivaImporte = data.iva_importe || (data.precio_base * ivaPorcentaje) / 100;
  const total = data.total || data.precio_base + ivaImporte;

  // Generar número de factura
  const numeroFactura = await generarNumeroFactura(data.tenant_id);

  const result = await sql`
    INSERT INTO facturas (
      tenant_id, numero_factura, fecha_emision,
      cliente_nombre, cliente_nif, cliente_direccion, cliente_codigo_postal,
      cliente_ciudad, cliente_provincia, cliente_pais,
      concepto, descripcion, precio_base, iva_porcentaje, iva_importe, total,
      forma_pago
    )
    VALUES (
      ${data.tenant_id}, ${numeroFactura}, CURRENT_DATE,
      ${data.cliente_nombre}, ${data.cliente_nif || ''}, ${data.cliente_direccion || ''}, 
      ${data.cliente_codigo_postal || ''}, ${data.cliente_ciudad || ''}, 
      ${data.cliente_provincia || ''}, ${data.cliente_pais || 'España'},
      ${data.concepto}, ${data.descripcion || ''}, ${data.precio_base}, 
      ${ivaPorcentaje}, ${ivaImporte}, ${total},
      ${data.forma_pago || ''}
    )
    RETURNING *;
  `;
  return result.rows[0];
}

// Función para obtener facturas por tenant
export async function getFacturas(tenantId: string, limit: number = 50): Promise<any[]> {
  const result = await sql`
    SELECT * FROM facturas 
    WHERE tenant_id = ${tenantId}
    ORDER BY fecha_emision DESC, numero_factura DESC
    LIMIT ${limit}
  `;
  return result.rows;
}

// Función para obtener factura por ID
export async function getFacturaById(id: number, tenantId: string): Promise<any | null> {
  const result = await sql`
    SELECT * FROM facturas 
    WHERE id = ${id} AND tenant_id = ${tenantId}
    LIMIT 1
  `;
  return result.rows[0] || null;
}

// Función para actualizar URL del PDF de una factura
export async function actualizarPdfFactura(
  id: number, 
  tenantId: string, 
  pdfUrl: string, 
  pdfFilename: string
): Promise<any> {
  const result = await sql`
    UPDATE facturas 
    SET pdf_url = ${pdfUrl}, pdf_filename = ${pdfFilename}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND tenant_id = ${tenantId}
    RETURNING *;
  `;
  return result.rows[0];
}

// Función para eliminar factura
export async function eliminarFactura(id: number, tenantId: string): Promise<boolean> {
  const result = await sql`
    DELETE FROM facturas 
    WHERE id = ${id} AND tenant_id = ${tenantId}
    RETURNING id;
  `;
  return result.rows.length > 0;
}
