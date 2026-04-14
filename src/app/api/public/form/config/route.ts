/**
 * Endpoint de configuración para el formulario público
 * 
 * Este endpoint devuelve la configuración necesaria para renderizar
 * el formulario según el país y adapter de la propiedad.
 * 
 * IMPORTANTE: Este endpoint es SOLO LECTURA y NO afecta los envíos actuales.
 * El form puede seguir enviando a /api/public/form/[slug]/submit sin cambios.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getAdapter } from '@/lib/adapters';
import { getTenantById } from '@/lib/tenant';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant');
    const propertyId = searchParams.get('property');

    // Validar parámetros
    if (!tenantId || !propertyId) {
      return NextResponse.json(
        {
          error: 'Parámetros requeridos: tenant y property',
          country: 'ES', // Fallback a España
          adapter: 'es-hospederias',
          fields: [],
          validations: {},
          locale: 'es',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Obtener configuración de la propiedad desde la base de datos
    const propertyResult = await sql`
      SELECT 
        tp.id,
        tp.country_code,
        tp.adapter_key,
        t.config,
        t.status
      FROM tenant_properties tp
      JOIN tenants t ON t.id = tp.tenant_id
      WHERE tp.id = ${propertyId}::integer
        AND tp.tenant_id = ${tenantId}::uuid
        AND t.status = 'active'
      LIMIT 1
    `;

    if (propertyResult.rows.length === 0) {
      // Si no se encuentra, devolver configuración por defecto (España)
      console.warn(`⚠️ Propiedad no encontrada: tenant=${tenantId}, property=${propertyId}`);
      return NextResponse.json(
        {
          error: 'Propiedad no encontrada o inactiva',
          country: 'ES',
          adapter: 'es-hospederias',
          fields: [],
          validations: {},
          locale: 'es',
        },
        { status: 404, headers: corsHeaders }
      );
    }

    const property = propertyResult.rows[0];
    const countryCode = property.country_code || 'ES';
    const adapterKey = property.adapter_key || 'es-hospederias';
    const tenantConfig = property.config || {};
    const locale = tenantConfig.language || 'es';

    // Flags por plan: el formulario solo debe mostrar "recibir instrucciones" si Standard/Pro
    let checkinEmailEnabled = false;
    try {
      const tenant = await getTenantById(String(tenantId));
      checkinEmailEnabled = !!(tenant && hasCheckinInstructionsEmailPlan(tenant));
    } catch {
      checkinEmailEnabled = false;
    }

    // Obtener el adapter correspondiente
    const adapter = getAdapter(adapterKey);

    if (!adapter) {
      // Si no se encuentra el adapter, usar el de España por defecto
      console.warn(`⚠️ Adapter no encontrado: ${adapterKey}, usando es-hospederias por defecto`);
      const defaultAdapter = getAdapter('es-hospederias');
      
      if (!defaultAdapter) {
        return NextResponse.json(
          {
            error: 'Error interno: adapter no disponible',
            country: countryCode,
            adapter: adapterKey,
            fields: [],
            validations: {},
            locale,
          },
          { status: 500, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          country: countryCode,
          adapter: 'es-hospederias', // Fallback
          fields: defaultAdapter.getRequiredFields(),
          validations: defaultAdapter.getValidationRules(),
          legalTexts: defaultAdapter.getLegalTexts(locale),
          locale,
          features: {
            checkinEmailEnabled,
          },
        },
        { headers: corsHeaders }
      );
    }

    // Retornar configuración del adapter
    return NextResponse.json(
      {
        country: countryCode,
        adapter: adapterKey,
        fields: adapter.getRequiredFields(),
        validations: adapter.getValidationRules(),
        legalTexts: adapter.getLegalTexts(locale),
        locale,
        features: {
          checkinEmailEnabled,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Error en /api/public/form/config:', error);
    
    // En caso de error, devolver configuración por defecto (España)
    const defaultAdapter = getAdapter('es-hospederias');
    
    return NextResponse.json(
      {
        error: 'Error al obtener configuración',
        country: 'ES',
        adapter: 'es-hospederias',
        fields: defaultAdapter?.getRequiredFields() || [],
        validations: defaultAdapter?.getValidationRules() || {},
        locale: 'es',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

