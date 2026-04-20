import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import type { MirUnitType } from '@/lib/mir-multi';

function normalizeUnitType(v: unknown): MirUnitType | null {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'habitacion' || s === 'habitación') return 'habitacion';
  if (s === 'apartamento' || s === 'vivienda') return 'apartamento';
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { getTenantId, getTenantById } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const tenant = await getTenantById(tenantId);
    const lodgingId =
      tenant?.lodging_id && String(tenant.lodging_id).trim() !== ''
        ? String(tenant.lodging_id)
        : String(tenantId);

    const { ensureMirMultiSchema, getMirUnitTypeMap, getMirUnitCredentialMap } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    const roomsRes = await sql`
      SELECT id::text AS id, name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
      ORDER BY id::text ASC
    `;

    const unitTypes = await getMirUnitTypeMap(tenantId);
    const assignments = await getMirUnitCredentialMap(tenantId);

    // Default: si tenant.config.lodgingType existe, aplicarlo como “tipo por defecto”
    const config = (tenant as any)?.config || {};
    const defaultType: MirUnitType =
      String(config?.lodgingType || '').toLowerCase() === 'apartamentos' ? 'apartamento' : 'habitacion';

    const units = roomsRes.rows.map((r) => {
      const roomId = String(r.id);
      return {
        room_id: roomId,
        room_name: r.name,
        unit_type: unitTypes.get(roomId) || defaultType,
        credencial_id: assignments.get(roomId) ?? null,
      };
    });

    return NextResponse.json({ success: true, units, total: units.length });
  } catch (e: any) {
    console.error('❌ [GET /api/ministerio/unidades-config] Error:', e);
    return NextResponse.json({ success: false, error: 'Error obteniendo configuración por unidad' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const roomId = String(body?.room_id || body?.roomId || '').trim();
    const unitType = normalizeUnitType(body?.unit_type ?? body?.unitType);
    const credencialIdRaw = body?.credencial_id ?? body?.credencialId ?? null;
    const credencialId = credencialIdRaw != null ? Number(credencialIdRaw) : null;

    if (!roomId) {
      return NextResponse.json({ success: false, error: 'room_id es obligatorio' }, { status: 400 });
    }

    const { ensureMirMultiSchema, upsertMirUnitType, assignCredentialToRoom } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    if (unitType) {
      await upsertMirUnitType(tenantId, roomId, unitType);
    }

    if (credencialId != null && Number.isFinite(credencialId)) {
      // Regla anti-trampa: si la unidad es apartamento, la credencial NO puede estar asignada a otro apartamento.
      // (Habitaciones sí pueden compartir).
      const effectiveType = unitType
        ? unitType
        : (
            await sql`
              SELECT unit_type
              FROM mir_unidades
              WHERE tenant_id = ${tenantId}::uuid AND room_id = ${roomId}
              LIMIT 1
            `
          ).rows?.[0]?.unit_type || null;

      const isApartamento = String(effectiveType) === 'apartamento';
      if (isApartamento) {
        const conflict = await sql`
          SELECT m.room_id
          FROM mir_unidad_credencial_map m
          JOIN mir_unidades u
            ON u.tenant_id = m.tenant_id AND u.room_id = m.room_id
          WHERE m.tenant_id = ${tenantId}::uuid
            AND m.credencial_id = ${credencialId}
            AND u.unit_type = 'apartamento'
            AND m.room_id <> ${roomId}
          LIMIT 1
        `;
        if (conflict.rows.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Una credencial MIR no puede usarse para dos apartamentos. Para añadir otro apartamento, contrata una unidad más y configura una credencial nueva.',
            },
            { status: 403 }
          );
        }
      }

      await assignCredentialToRoom(tenantId, roomId, credencialId);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('❌ [POST /api/ministerio/unidades-config] Error:', e);
    return NextResponse.json({ success: false, error: 'Error guardando configuración por unidad' }, { status: 500 });
  }
}

