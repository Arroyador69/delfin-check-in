import { NextRequest, NextResponse } from 'next/server';
import { denyDebugApiInProduction } from '@/lib/security-deployment';
import { isSuperAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const denied = denyDebugApiInProduction();
  if (denied) return denied;

  if (!isSuperAdmin(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const config = {
      MIR_BASE_URL: process.env.MIR_BASE_URL ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_USER: process.env.MIR_HTTP_USER ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_HTTP_PASS: process.env.MIR_HTTP_PASS ? '***CONFIGURADO***' : 'NO CONFIGURADO',
      MIR_CODIGO_ARRENDADOR: process.env.MIR_CODIGO_ARRENDADOR
        ? '***CONFIGURADO***'
        : 'NO CONFIGURADO',
      MIR_APLICACION: process.env.MIR_APLICACION || 'Delfin_Check_in',
      MIR_SIMULACION: process.env.MIR_SIMULACION || 'false',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NO CONFIGURADO',
    };

    const credencialesConfiguradas = !!(
      process.env.MIR_HTTP_USER &&
      process.env.MIR_HTTP_PASS &&
      process.env.MIR_CODIGO_ARRENDADOR
    );

    const mirBase = process.env.MIR_BASE_URL || '';
    const urlValida = mirBase.includes('mir.es');
    const modoSimulacion = config.MIR_SIMULACION === 'true';

    const analisis = {
      configuracionCompleta: credencialesConfiguradas && urlValida,
      credencialesConfiguradas,
      urlValida,
      modoSimulacion,
      problemas: [] as string[],
    };

    if (!credencialesConfiguradas) {
      analisis.problemas.push(
        'Faltan credenciales del MIR (MIR_HTTP_USER, MIR_HTTP_PASS, MIR_CODIGO_ARRENDADOR)'
      );
    }

    if (!urlValida) {
      analisis.problemas.push('URL del MIR no válida o no configurada');
    }

    if (modoSimulacion) {
      analisis.problemas.push(
        'Sistema en modo simulación - no se envían datos reales al MIR'
      );
    }

    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      analisis.problemas.push(
        'NEXT_PUBLIC_BASE_URL no configurada - puede afectar el auto-envío'
      );
    }

    return NextResponse.json({
      success: true,
      configuracion: config,
      analisis,
      recomendaciones: [
        'Configurar variables en Vercel (Environment Variables), nunca en el repositorio',
        'Confirmar credenciales MIR por tenant en Ajustes → Configuración MIR',
        'MIR_SIMULACION=false para envíos reales',
      ],
    });
  } catch (error) {
    console.error('Error verificando configuración MIR:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error verificando configuración',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
