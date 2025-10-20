import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 TEST FORM SUBMISSION: Probando envío de formulario...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      return NextResponse.json({
        ok: false,
        error: 'No se recibieron datos JSON'
      }, { status: 400 });
    }
    
    console.log('📋 Datos recibidos:', JSON.stringify(json, null, 2));
    
    // Verificar estructura básica
    const hasContrato = !!json.contrato;
    const hasViajeros = !!json.viajeros && Array.isArray(json.viajeros);
    const viajerosCount = hasViajeros ? json.viajeros.length : 0;
    
    console.log('🔍 Estructura detectada:', {
      hasContrato,
      hasViajeros,
      viajerosCount,
      contratoKeys: hasContrato ? Object.keys(json.contrato) : [],
      viajerosKeys: hasViajeros && viajerosCount > 0 ? Object.keys(json.viajeros[0]) : []
    });
    
    // Validación básica
    const issues: any[] = [];
    
    if (!hasContrato) {
      issues.push({ path: 'contrato', message: 'Se requiere objeto contrato' });
    }
    
    if (!hasViajeros || viajerosCount === 0) {
      issues.push({ path: 'viajeros', message: 'Se requiere al menos un viajero' });
    }
    
    if (hasViajeros && viajerosCount > 0) {
      json.viajeros.forEach((v: any, index: number) => {
        const prefix = `viajeros[${index}]`;
        if (!v.nombre) issues.push({ path: `${prefix}.nombre`, message: 'Requerido' });
        if (!v.primerApellido) issues.push({ path: `${prefix}.primerApellido`, message: 'Requerido' });
        if (!v.fechaNacimiento) issues.push({ path: `${prefix}.fechaNacimiento`, message: 'Requerido' });
        if (!v.tipoDocumento) issues.push({ path: `${prefix}.tipoDocumento`, message: 'Requerido' });
        if (!v.numeroDocumento) issues.push({ path: `${prefix}.numeroDocumento`, message: 'Requerido' });
        if (!v.direccion) issues.push({ path: `${prefix}.direccion`, message: 'Requerido' });
      });
    }
    
    return NextResponse.json({
      ok: true,
      message: 'Formulario recibido correctamente',
      validacion: {
        tieneErrores: issues.length > 0,
        errores: issues,
        resumen: {
          viajerosAnalizados: viajerosCount,
          erroresEncontrados: issues.length,
          validacionCorrecta: issues.length === 0
        }
      },
      datos: {
        contrato: hasContrato ? json.contrato : null,
        viajeros: hasViajeros ? json.viajeros : [],
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test form submission:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
