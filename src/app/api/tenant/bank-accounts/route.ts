// =====================================================
// API: GESTIÓN DE CUENTAS BANCARIAS DE PROPIETARIOS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { getStripeServer } from '@/lib/stripe-server';

// =====================================================
// GET: Obtener cuentas bancarias del tenant
// =====================================================

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT 
        id,
        tenant_id,
        iban,
        bank_name,
        account_holder_name,
        stripe_account_id,
        is_verified,
        verification_status,
        is_default,
        is_active,
        currency,
        created_at,
        updated_at
      FROM tenant_bank_accounts
      WHERE tenant_id = ${tenantId}
      ORDER BY is_default DESC, created_at DESC
    `;

    return NextResponse.json({
      success: true,
      bank_accounts: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cuentas bancarias:', error);
    return NextResponse.json(
      { success: false, error: 'Error obteniendo cuentas bancarias' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: Crear nueva cuenta bancaria
// =====================================================

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { iban, bank_name, account_holder_name } = data;

    // Validar datos requeridos
    if (!iban || !account_holder_name) {
      return NextResponse.json(
        { success: false, error: 'IBAN y nombre del titular son requeridos' },
        { status: 400 }
      );
    }

    // Limpiar IBAN (quitar espacios)
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();

    // Validar formato básico de IBAN
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/.test(cleanIban)) {
      return NextResponse.json(
        { success: false, error: 'Formato de IBAN inválido' },
        { status: 400 }
      );
    }

    console.log('💳 Creando cuenta bancaria para tenant:', tenantId);

    // Obtener stripe_customer_id del tenant
    const tenantResult = await sql`
      SELECT stripe_customer_id FROM tenants WHERE id = ${tenantId}
    `;

    const stripeCustomerId = tenantResult.rows[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Si no existe customer en Stripe, crearlo
      console.log('📝 No hay customer en Stripe, creando uno...');
      
      const customerData = await sql`
        SELECT name, email FROM tenants WHERE id = ${tenantId}
      `;

      const customer = await getStripeServer().customers.create({
        name: customerData.rows[0].name,
        email: customerData.rows[0].email,
        metadata: {
          tenant_id: tenantId
        }
      });

      // Actualizar tenant con customer ID
      await sql`
        UPDATE tenants 
        SET stripe_customer_id = ${customer.id}
        WHERE id = ${tenantId}
      `;

      console.log('✅ Customer creado en Stripe:', customer.id);
    }

    // Extraer código de país del IBAN
    const countryCode = cleanIban.substring(0, 2);

    // Crear External Account en Stripe
    const externalAccount = await getStripeServer().customers.createSource(
      stripeCustomerId,
      {
        // Stripe types esperan un token/string, pero Stripe acepta el objeto bank_account.
        // Lo casteamos para evitar bloquear el type-check.
        source: {
          object: 'bank_account',
          country: countryCode,
          currency: 'eur',
          account_number: cleanIban,
          account_holder_name: account_holder_name
        } as any
      } as any
    );

    console.log('✅ External Account creada en Stripe:', externalAccount.id);

    // Insertar en la base de datos
    const insertResult = await sql`
      INSERT INTO tenant_bank_accounts (
        tenant_id,
        iban,
        bank_name,
        account_holder_name,
        stripe_account_id,
        stripe_customer_id,
        currency
      ) VALUES (
        ${tenantId},
        ${cleanIban},
        ${bank_name || null},
        ${account_holder_name},
        ${externalAccount.id},
        ${stripeCustomerId},
        'EUR'
      )
      RETURNING *
    `;

    console.log('✅ Cuenta bancaria creada en BD');

    return NextResponse.json({
      success: true,
      bank_account: insertResult.rows[0],
      message: 'Cuenta bancaria añadida correctamente. Stripe verificará la cuenta automáticamente.'
    });

  } catch (error: any) {
    console.error('❌ Error creando cuenta bancaria:', error);
    
    // Manejar errores específicos de Stripe
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { success: false, error: `Error de validación: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error creando cuenta bancaria' },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE: Eliminar cuenta bancaria
// =====================================================

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const bankAccountId = searchParams.get('id');

    if (!bankAccountId) {
      return NextResponse.json(
        { success: false, error: 'ID de cuenta bancaria requerido' },
        { status: 400 }
      );
    }

    // Obtener información de la cuenta bancaria
    const accountResult = await sql`
      SELECT stripe_account_id, stripe_customer_id
      FROM tenant_bank_accounts
      WHERE id = ${bankAccountId} AND tenant_id = ${tenantId}
    `;

    if (accountResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cuenta bancaria no encontrada' },
        { status: 404 }
      );
    }

    const account = accountResult.rows[0];

    // Eliminar External Account de Stripe
    if (account.stripe_account_id) {
      await getStripeServer().customers.deleteSource(
        account.stripe_customer_id,
        account.stripe_account_id
      );
      console.log('✅ External Account eliminada de Stripe');
    }

    // Eliminar de la base de datos
    await sql`
      DELETE FROM tenant_bank_accounts
      WHERE id = ${bankAccountId} AND tenant_id = ${tenantId}
    `;

    console.log('✅ Cuenta bancaria eliminada de BD');

    return NextResponse.json({
      success: true,
      message: 'Cuenta bancaria eliminada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando cuenta bancaria:', error);
    return NextResponse.json(
      { success: false, error: 'Error eliminando cuenta bancaria' },
      { status: 500 }
    );
  }
}

