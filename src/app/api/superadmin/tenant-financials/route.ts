/**
 * ========================================
 * API: Datos Financieros por Tenant
 * ========================================
 * Calcula ingresos, gastos y balance para cada tenant
 * Para superadmin: control de rentabilidad
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { isSuperAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    // Verificar que es superadmin
    if (!isSuperAdmin(req)) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Obtener todos los tenants
    const tenants = await sql`
      SELECT id, name, email, plan_type
      FROM tenants
      WHERE status = 'active'
      ORDER BY name
    `;

    // Para cada tenant, calcular ingresos y gastos
    const financials = await Promise.all(
      tenants.rows.map(async (tenant) => {
        const tenantId = tenant.id;

        // Ingresos: Suscripciones
        const subscriptionRevenue = await sql`
          SELECT COALESCE(SUM(total_price), 0) as total
          FROM tenant_revenues
          WHERE tenant_id = ${tenantId}::uuid
            AND revenue_type = 'subscription'
        `;

        // Ingresos: Comisiones de reservas directas
        const commissionRevenue = await sql`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM tenant_revenues
          WHERE tenant_id = ${tenantId}::uuid
            AND revenue_type = 'commission'
        `;

        // Gastos: Stripe fees
        const stripeFeeCosts = await sql`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM tenant_costs
          WHERE tenant_id = ${tenantId}::uuid
            AND cost_type = 'stripe_fee'
        `;

        // Gastos: Reembolsos
        const refundCosts = await sql`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM tenant_costs
          WHERE tenant_id = ${tenantId}::uuid
            AND cost_type = 'refund'
        `;

        // Gastos: Otros
        const otherCosts = await sql`
          SELECT COALESCE(SUM(amount), 0) as total
          FROM tenant_costs
          WHERE tenant_id = ${tenantId}::uuid
            AND cost_type NOT IN ('stripe_fee', 'refund')
        `;

        const subscriptionRev = parseFloat(subscriptionRevenue.rows[0]?.total || '0');
        const commissionRev = parseFloat(commissionRevenue.rows[0]?.total || '0');
        const stripeFees = parseFloat(stripeFeeCosts.rows[0]?.total || '0');
        const refunds = parseFloat(refundCosts.rows[0]?.total || '0');
        const others = parseFloat(otherCosts.rows[0]?.total || '0');

        const totalRevenue = subscriptionRev + commissionRev;
        const totalCosts = stripeFees + refunds + others;
        const balance = totalRevenue - totalCosts;

        return {
          tenant_id: tenantId,
          tenant_name: tenant.name || 'Sin nombre',
          tenant_email: tenant.email || '',
          plan_type: tenant.plan_type || 'free',
          total_revenue: totalRevenue,
          total_costs: totalCosts,
          balance: balance,
          subscription_revenue: subscriptionRev,
          commission_revenue: commissionRev,
          stripe_fee_costs: stripeFees,
          refund_costs: refunds,
          other_costs: others,
          is_profitable: balance >= 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      financials,
      summary: {
        total_tenants: financials.length,
        profitable_tenants: financials.filter(f => f.is_profitable).length,
        unprofitable_tenants: financials.filter(f => !f.is_profitable).length,
        total_revenue: financials.reduce((sum, f) => sum + f.total_revenue, 0),
        total_costs: financials.reduce((sum, f) => sum + f.total_costs, 0),
        total_balance: financials.reduce((sum, f) => sum + f.balance, 0)
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo datos financieros:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

