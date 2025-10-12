import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 TEST VALIDATION: Probando validación de datos...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      return NextResponse.json({
        ok: false,
        error: 'No se recibieron datos JSON'
      }, { status: 400 });
    }
    
    console.log('📋 Datos recibidos para validación:', JSON.stringify(json, null, 2));
    
    // Simular la validación que hace registro-flex
    const issues: any[] = [];
    const viajeros = json.viajeros || [];
    
    if (!viajeros.length) {
      issues.push({ path: 'viajeros', message: 'Se requiere al menos un viajero' });
    } else {
      viajeros.forEach((v: any, index: number) => {
        const prefix = `viajeros[${index}]`;
        if (!v.nombre) issues.push({ path: `${prefix}.nombre`, message: 'Requerido' });
        if (!v.primerApellido) issues.push({ path: `${prefix}.primerApellido`, message: 'Requerido' });
        if (!v.fechaNacimiento) issues.push({ path: `${prefix}.fechaNacimiento`, message: 'Requerido (YYYY-MM-DD)' });
        if (!v.tipoDocumento) issues.push({ path: `${prefix}.tipoDocumento`, message: 'Requerido' });
        if (!v.numeroDocumento) issues.push({ path: `${prefix}.numeroDocumento`, message: 'Requerido' });
        if (!v.direccion) issues.push({ path: `${prefix}.direccion`, message: 'Requerido' });
        if (!v.cp || !/^\d{5}$/.test(v.cp)) issues.push({ path: `${prefix}.cp`, message: 'Debe ser 5 dígitos' });
        
        // Validación condicional de INE: solo para españoles
        const esEspana = v.paisResidencia === 'ESP';
        if (esEspana) {
          if (!v.ine || !/^\d{5}$/.test(v.ine)) {
            issues.push({ path: `${prefix}.ine`, message: 'Para españoles: debe ser 5 dígitos' });
          }
        } else {
          // Para extranjeros, INE debe estar vacío y nombreMunicipio es requerido
          if (v.ine && v.ine.trim() !== '') {
            issues.push({ path: `${prefix}.ine`, message: 'Para extranjeros: debe estar vacío' });
          }
          if (!v.nombreMunicipio || v.nombreMunicipio.trim() === '') {
            issues.push({ path: `${prefix}.nombreMunicipio`, message: 'Para extranjeros: requerido' });
          }
        }
      });
    }
    
    return NextResponse.json({
      ok: true,
      validacion: {
        tieneErrores: issues.length > 0,
        errores: issues,
        resumen: {
          viajerosAnalizados: viajeros.length,
          erroresEncontrados: issues.length,
          validacionCorrecta: issues.length === 0
        }
      },
      datos: {
        viajeros: viajeros.map((v: any, index: number) => ({
          index: index + 1,
          nombre: v.nombre,
          pais: v.paisResidencia,
          esEspana: v.paisResidencia === 'ESP',
          tieneIne: !!v.ine,
          tieneNombreMunicipio: !!v.nombreMunicipio,
          camposDireccion: {
            direccion: v.direccion,
            cp: v.cp,
            ine: v.ine,
            nombreMunicipio: v.nombreMunicipio,
            paisResidencia: v.paisResidencia
          }
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test validation:', error);
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
