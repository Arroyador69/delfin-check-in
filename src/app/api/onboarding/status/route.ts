import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    // Verificar si existe una aceptación del DPA
    const dpaResult = await sql`
      SELECT * FROM dpa_aceptaciones 
      WHERE tenant_id = ${tenantId} 
      AND onboarding_completo = true
      LIMIT 1
    `;

    // Verificar si existen datos de empresa
    const empresaResult = await sql`
      SELECT * FROM empresa_config 
      WHERE tenant_id = ${tenantId}
      LIMIT 1
    `;

    // Verificar si existe configuración MIR
    const mirResult = await sql`
      SELECT * FROM mir_configuraciones 
      WHERE propietario_id = ${tenantId}
      LIMIT 1
    `;

    const onboardingCompleto = dpaResult.rows.length > 0 && 
                              empresaResult.rows.length > 0 && 
                              mirResult.rows.length > 0;

    return NextResponse.json({
      onboardingCompleto,
      dpaAceptado: dpaResult.rows.length > 0,
      empresaConfigurada: empresaResult.rows.length > 0,
      mirConfigurado: mirResult.rows.length > 0,
      dpa: dpaResult.rows[0] || null,
      empresa: empresaResult.rows[0] || null,
      mir: mirResult.rows[0] || null
    });

  } catch (error) {
    console.error('Error verificando estado del onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
