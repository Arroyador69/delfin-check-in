import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    // Priorizar tenant_id desde JWT; si no está, caer al header (middleware)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 401 });
    }

    // Resolver lodging_id: a veces queda un valor viejo (p. ej. cuid) y el onboarding crea
    // Lodging/Room bajo el UUID del tenant; sin fallback el paso 6 ve 0 habitaciones.
    const lodgingResult = await sql`
      SELECT lodging_id FROM tenants WHERE id = ${tenantId}::uuid
    `;
    const storedLodgingId = lodgingResult.rows[0]?.lodging_id;
    const primaryLodgingId =
      storedLodgingId != null && String(storedLodgingId).trim() !== ''
        ? String(storedLodgingId).trim()
        : tenantId;

    let result = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId"::text = ${primaryLodgingId}
      ORDER BY id ASC
    `;

    if (
      result.rows.length === 0 &&
      primaryLodgingId !== tenantId
    ) {
      const fallback = await sql`
        SELECT id, name
        FROM "Room"
        WHERE "lodgingId"::text = ${tenantId}
        ORDER BY id ASC
      `;
      if (fallback.rows.length > 0) {
        console.warn(
          `⚠️ [GET /api/tenant/rooms] Sin habitaciones para lodging_id=${primaryLodgingId}; usando tenantId=${tenantId} (${fallback.rows.length} filas). Revisa tenants.lodging_id.`
        );
        result = fallback;
      }
    }

    const rooms = result.rows.map((row) => ({
      id: typeof row.id === 'number' ? row.id : parseInt(String(row.id), 10) || row.id,
      name: row.name,
    }));

    return NextResponse.json({
      success: true,
      rooms: rooms
    });

  } catch (error) {
    console.error('Error obteniendo habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Priorizar tenant_id desde JWT; si no está, caer al header (middleware)
    let tenantId = await getTenantId(req);
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id');
    }
    
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      console.error('❌ [POST /api/tenant/rooms] No se pudo identificar el tenant válido');
      return NextResponse.json({
        success: false,
        error: 'No se pudo identificar el tenant'
      }, { status: 401 });
    }
    
    console.log('🏢 [POST /api/tenant/rooms] Tenant identificado:', tenantId);
    const body = await req.json().catch(() => ({}));
    const rawRooms = body?.rooms;

    if (!Array.isArray(rawRooms)) {
      return NextResponse.json({
        success: false,
        message: 'Formato de datos inválido'
      }, { status: 400 });
    }

    // Normalizar rooms: el cliente puede mandar [{ name }] (sin id) durante onboarding.
    // Internamente usamos ids consecutivos desde 1.
    const rooms = rawRooms
      .map((r: any, idx: number) => ({
        id: r?.id != null && String(r.id).trim() !== '' ? String(r.id) : String(idx + 1),
        name: String(r?.name || '').trim(),
      }))
      .filter((r: any) => r.name);

    if (rooms.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Debes enviar al menos una propiedad/habitación válida' },
        { status: 400 }
      );
    }

    // Validar límite por plan usando el nuevo sistema de permisos
    const { validateUnitCreation } = await import('@/lib/permissions');
    const { getTenantById } = await import('@/lib/tenant');
    
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({
        success: false,
        message: 'Tenant no encontrado'
      }, { status: 404 });
    }

    // Verificar/crear registro en Lodging antes de insertar habitaciones.
    // Importante: en Neon puede existir una tabla Lodging con distinto schema; por eso evitamos
    // insertar columnas opcionales (created_at/updated_at) para no romper compatibilidad.
    let lodgingId: string;
    // Opcional: permitir que el cliente indique tipo de alojamiento si el schema lo soporta.
    // Ejemplos deseados: 'hostal' | 'apartamentos' (dependiendo de enum/texto en BD).
    const requestedLodgingType = typeof body?.lodgingType === 'string' ? body.lodgingType.trim() : '';
    
    try {
      // Primero, intentar crear la tabla Lodging si no existe (schema mínimo)
      await sql`
        CREATE TABLE IF NOT EXISTS "Lodging" (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        )
      `;
      console.log(`✅ Tabla Lodging verificada/creada`);

      // Detectar si existe columna "type" en Lodging (algunas BD la tienen como NOT NULL)
      const typeColumn = await sql`
        SELECT
          is_nullable,
          data_type,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Lodging'
          AND column_name = 'type'
        LIMIT 1
      `;

      const hasTypeColumn = typeColumn.rows.length > 0;
      const typeUdtName = hasTypeColumn ? String(typeColumn.rows[0].udt_name || '') : '';
      const typeDataType = hasTypeColumn ? String(typeColumn.rows[0].data_type || '') : '';
      // const typeIsNullable = hasTypeColumn ? String(typeColumn.rows[0].is_nullable || '') : '';

      // Algunas BDs usan timestamps camelCase (createdAt/updatedAt) y pueden ser NOT NULL sin default.
      // Detectamos si existen para incluirlos en el INSERT/UPDATE.
      const createdAtColumn = await sql`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Lodging'
          AND column_name = 'createdAt'
        LIMIT 1
      `;
      const updatedAtColumn = await sql`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Lodging'
          AND column_name = 'updatedAt'
        LIMIT 1
      `;
      const hasCreatedAtColumn = createdAtColumn.rows.length > 0;
      const hasUpdatedAtColumn = updatedAtColumn.rows.length > 0;

      // Si "type" es enum, leer valores para elegir uno válido.
      let enumTypeValues: string[] = [];
      if (hasTypeColumn && typeDataType === 'USER-DEFINED' && typeUdtName) {
        try {
          const enumRows = await sql`
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = 'public'
              AND t.typname = ${typeUdtName}
            ORDER BY e.enumsortorder ASC
          `;
          enumTypeValues = enumRows.rows.map((r: any) => String(r.enumlabel));
        } catch (e) {
          // No es crítico; si falla, tratamos como texto y usamos requestedLodgingType si viene.
          enumTypeValues = [];
        }
      }

      const preferredTypeCandidates = [
        requestedLodgingType,
        'hostal',
        'hostel',
        'hotel',
        'apartamentos',
        'apartments',
        'apartment',
      ].filter(Boolean) as string[];

      const chosenType =
        enumTypeValues.length > 0
          ? (preferredTypeCandidates.find((c) => enumTypeValues.includes(c)) || enumTypeValues[0])
          : (preferredTypeCandidates[0] || '');

      // Algunas BDs tienen Lodging.description NOT NULL
      const descColumn = await sql`
        SELECT data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Lodging'
          AND column_name = 'description'
        LIMIT 1
      `;
      const hasDescriptionColumn = descColumn.rows.length > 0;
      const defaultDescription = tenant.name ? `Alojamiento de ${tenant.name}` : 'Alojamiento';
      
      // Verificar si ya existe un registro en Lodging para este tenant
      const existingLodging = await sql`
        SELECT id FROM "Lodging" 
        WHERE id::text = ${tenantId}::text
        LIMIT 1
      `;
      
      if (existingLodging.rows.length > 0) {
        // Ya existe, usar ese ID
        lodgingId = existingLodging.rows[0].id;
        console.log(`✅ Encontrado registro existente en Lodging: ${lodgingId}`);
      } else {
        // Crear el registro en Lodging
        const insertResult =
          hasTypeColumn && hasDescriptionColumn && chosenType
            ? hasCreatedAtColumn && hasUpdatedAtColumn
              ? await sql`
                  INSERT INTO "Lodging" (id, name, type, description, "createdAt", "updatedAt")
                  VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType}, ${defaultDescription}, NOW(), NOW())
                  ON CONFLICT (id) DO UPDATE
                  SET
                    name = ${tenant.name || 'Mi Propiedad'},
                    type = COALESCE("Lodging".type, ${chosenType}),
                    description = COALESCE("Lodging".description, ${defaultDescription}),
                    "updatedAt" = NOW()
                  RETURNING id
                `
              : hasUpdatedAtColumn
                ? await sql`
                    INSERT INTO "Lodging" (id, name, type, description, "updatedAt")
                    VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType}, ${defaultDescription}, NOW())
                    ON CONFLICT (id) DO UPDATE
                    SET
                      name = ${tenant.name || 'Mi Propiedad'},
                      type = COALESCE("Lodging".type, ${chosenType}),
                      description = COALESCE("Lodging".description, ${defaultDescription}),
                      "updatedAt" = NOW()
                    RETURNING id
                  `
                : await sql`
                    INSERT INTO "Lodging" (id, name, type, description)
                    VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType}, ${defaultDescription})
                    ON CONFLICT (id) DO UPDATE
                    SET
                      name = ${tenant.name || 'Mi Propiedad'},
                      type = COALESCE("Lodging".type, ${chosenType}),
                      description = COALESCE("Lodging".description, ${defaultDescription})
                    RETURNING id
                  `
            : hasTypeColumn && chosenType
              ? hasCreatedAtColumn && hasUpdatedAtColumn
                ? await sql`
                    INSERT INTO "Lodging" (id, name, type, "createdAt", "updatedAt")
                    VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType}, NOW(), NOW())
                    ON CONFLICT (id) DO UPDATE
                    SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                    RETURNING id
                  `
                : hasUpdatedAtColumn
                  ? await sql`
                      INSERT INTO "Lodging" (id, name, type, "updatedAt")
                      VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType}, NOW())
                      ON CONFLICT (id) DO UPDATE
                      SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                      RETURNING id
                    `
                  : await sql`
                      INSERT INTO "Lodging" (id, name, type)
                      VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${chosenType})
                      ON CONFLICT (id) DO UPDATE SET name = ${tenant.name || 'Mi Propiedad'}
                      RETURNING id
                    `
              : hasDescriptionColumn
                ? hasCreatedAtColumn && hasUpdatedAtColumn
                  ? await sql`
                      INSERT INTO "Lodging" (id, name, description, "createdAt", "updatedAt")
                      VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${defaultDescription}, NOW(), NOW())
                      ON CONFLICT (id) DO UPDATE
                      SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                      RETURNING id
                    `
                  : hasUpdatedAtColumn
                    ? await sql`
                        INSERT INTO "Lodging" (id, name, description, "updatedAt")
                        VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${defaultDescription}, NOW())
                        ON CONFLICT (id) DO UPDATE
                        SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                        RETURNING id
                      `
                    : await sql`
                        INSERT INTO "Lodging" (id, name, description)
                        VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, ${defaultDescription})
                        ON CONFLICT (id) DO UPDATE SET name = ${tenant.name || 'Mi Propiedad'}
                        RETURNING id
                      `
                : hasCreatedAtColumn && hasUpdatedAtColumn
                  ? await sql`
                      INSERT INTO "Lodging" (id, name, "createdAt", "updatedAt")
                      VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, NOW(), NOW())
                      ON CONFLICT (id) DO UPDATE
                      SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                      RETURNING id
                    `
                  : hasUpdatedAtColumn
                    ? await sql`
                        INSERT INTO "Lodging" (id, name, "updatedAt")
                        VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'}, NOW())
                        ON CONFLICT (id) DO UPDATE
                        SET name = ${tenant.name || 'Mi Propiedad'}, "updatedAt" = NOW()
                        RETURNING id
                      `
                    : await sql`
                        INSERT INTO "Lodging" (id, name)
                        VALUES (${tenantId}::uuid, ${tenant.name || 'Mi Propiedad'})
                        ON CONFLICT (id) DO UPDATE SET name = ${tenant.name || 'Mi Propiedad'}
                        RETURNING id
                      `;
        
        if (insertResult.rows.length > 0) {
          lodgingId = insertResult.rows[0].id;
          console.log(`✅ Creado registro en Lodging: ${lodgingId}`);
        } else {
          // Si aún no se creó, intentar obtenerlo de nuevo
          const retryCheck = await sql`
            SELECT id FROM "Lodging" WHERE id::text = ${tenantId}::text LIMIT 1
          `;
          if (retryCheck.rows.length > 0) {
            lodgingId = retryCheck.rows[0].id;
            console.log(`✅ Registro encontrado después del INSERT: ${lodgingId}`);
          } else {
            throw new Error('No se pudo crear ni encontrar registro en Lodging después de múltiples intentos');
          }
        }
      }
      
      // Actualizar tenants.lodging_id para futuras consultas
      try {
        await sql`
          UPDATE tenants 
          SET lodging_id = ${lodgingId}::text 
          WHERE id = ${tenantId}::uuid
        `;
        console.log(`✅ Actualizado lodging_id en tenants: ${lodgingId}`);
      } catch (updateError: any) {
        console.warn(`⚠️ No se pudo actualizar lodging_id en tenants:`, updateError.message);
        // No es crítico, continuar
      }
      
    } catch (error: any) {
      console.error(`❌ Error crítico creando/verificando Lodging:`, error);
      return NextResponse.json({
        success: false,
        error: `No se pudo configurar el lodging para este tenant. Por favor, contacta al soporte. Error: ${error.message}`
      }, { status: 500 });
    }

    // Obtener conteo actual de habitaciones
    const existingRoomsCount = await sql`
      SELECT COUNT(*) as count 
      FROM "Room" r
      WHERE r."lodgingId" = ${lodgingId}
    `;
    const currentCount = parseInt(existingRoomsCount.rows[0]?.count || '0', 10);
    
    // Validar que puede crear las nuevas habitaciones
    // IMPORTANTE: Validar el número FINAL de habitaciones, no el incremento
    const finalCount = rooms.length; // Después de eliminar y recrear, será el número total
    const { canCreateUnit } = await import('@/lib/tenant');
    const validation = canCreateUnit(tenant, finalCount);
    
    console.log(`🔍 [POST /api/tenant/rooms] Validación:`, {
      plan_type: tenant.plan_type,
      currentCount,
      finalCount,
      roomsToSave: rooms.length,
      canCreate: validation.canCreate,
      reason: validation.reason
    });
    
    if (!validation.canCreate) {
      const planType = tenant.plan_type || 'free';
      let errorMessage = validation.reason || 'No puedes crear más habitaciones';
      
      // Mensajes personalizados según el plan
      if (planType === 'free' && finalCount > 1) {
        errorMessage = 'Has alcanzado el límite de 1 propiedad del Plan Básico. Actualiza a Check-in, Standard o Pro para añadir más.';
      } else if (planType === 'checkin') {
        errorMessage = `Puedes añadir más propiedades; cada una adicional son 2€/mes. Actualmente tienes ${finalCount}.`;
      } else if (planType === 'standard' && finalCount > 1) {
        errorMessage = `Standard incluye 1 propiedad en la cuota. Las adicionales son 2€/mes cada una.`;
      } else if (planType === 'pro' && finalCount > 1) {
        errorMessage = `Pro incluye 1 propiedad en la cuota. Las adicionales son 2€/mes cada una.`;
      }
      
      console.error(`❌ [POST /api/tenant/rooms] Validación fallida:`, errorMessage);
      return NextResponse.json({
        success: false,
        error: errorMessage,
        current_usage: finalCount,
        max_included: planType === 'free' ? 1 : planType === 'standard' || planType === 'pro' ? 1 : null,
        plan_type: planType,
        needs_upgrade: validation.needsUpgrade || false,
        upgrade_plan: validation.upgradePlan || null
      }, { status: 403 });
    }
    
    console.log(`🏢 Tenant ${tenantId} (${tenant.name}): Plan ${tenant.plan_type || 'free'}, ${currentCount} habitaciones actuales, creando ${rooms.length} nuevas`);

    // Obtener habitaciones existentes
    const existingRooms = await sql`
      SELECT id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id ASC
    `;

    console.log('Habitaciones existentes:', existingRooms.rows);
    console.log('Habitaciones a guardar:', rooms);

    // Primero, eliminar todas las habitaciones existentes para evitar conflictos
    // Luego insertar las nuevas
    await sql`
      DELETE FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
    `;
    console.log(`🗑️ Eliminadas ${existingRooms.rows.length} habitaciones existentes para recrearlas`);

    // Insertar todas las habitaciones nuevas
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const roomId = String(room.id);
      
      try {
        // Usar INSERT con ON CONFLICT para evitar duplicados
        await sql`
          INSERT INTO "Room" (id, name, "lodgingId", created_at, updated_at)
          VALUES (${roomId}, ${room.name}, ${lodgingId}, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE
          SET name = ${room.name}, updated_at = NOW(), "lodgingId" = ${lodgingId}
        `;
        console.log(`✅ Habitación ${roomId} guardada: ${room.name}`);
      } catch (insertError: any) {
        console.error(`❌ Error insertando habitación ${roomId}:`, insertError);
        // Si falla, intentar actualizar
        try {
          await sql`
            UPDATE "Room"
            SET name = ${room.name}, updated_at = NOW(), "lodgingId" = ${lodgingId}
            WHERE id = ${roomId}
          `;
          console.log(`✅ Habitación ${roomId} actualizada: ${room.name}`);
        } catch (updateError: any) {
          console.error(`❌ Error también al actualizar habitación ${roomId}:`, updateError);
          throw new Error(`No se pudo guardar la habitación ${roomId}: ${insertError.message}`);
        }
      }
    }

    // Eliminar habitaciones que excedan el límite del plan (si es necesario)
    // Solo eliminar si el usuario tiene menos habitaciones que el máximo permitido
    const maxRoomsAllowed = tenant.max_rooms === -1 ? Infinity : tenant.max_rooms;
    if (rooms.length < existingRooms.rows.length && maxRoomsAllowed !== Infinity) {
      // Eliminar habitaciones que excedan el límite
      const roomsToDelete = await sql`
        DELETE FROM "Room"
        WHERE "lodgingId" = ${lodgingId}
        AND id::integer > ${rooms.length}
        RETURNING id, name
      `;
      
      if (roomsToDelete.rows.length > 0) {
        console.log('🗑️ Habitaciones eliminadas:', roomsToDelete.rows);
      }
    }

    if (requestedLodgingType === 'hostal' || requestedLodgingType === 'apartamentos') {
      try {
        await sql`
          UPDATE tenants
          SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('lodgingType', ${requestedLodgingType})
          WHERE id = ${tenantId}::uuid
        `;
      } catch (cfgErr) {
        console.warn('⚠️ No se pudo persistir lodgingType en tenants.config:', cfgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración de habitaciones guardada correctamente',
      rooms: rooms
    });

  } catch (error) {
    console.error('Error guardando habitaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error guardando habitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
