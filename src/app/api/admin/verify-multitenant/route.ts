// =====================================================
// ENDPOINT DE VERIFICACIÓN DE CONEXIONES MULTITENANT
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyMultitenantConnections, testMultitenantInsertion } from '@/lib/verify-multitenant';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Iniciando verificación de conexiones multitentant...');

    // Verificar conexiones
    const verificationResult = await verifyMultitenantConnections();
    
    if (!verificationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Error en verificación de conexiones',
        details: verificationResult.error
      }, { status: 500 });
    }

    // Probar inserción de datos
    const testResult = await testMultitenantInsertion();
    
    if (!testResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Error en prueba de inserción',
        details: testResult.error,
        verification: verificationResult.data
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '✅ Todas las conexiones multitentant funcionan correctamente',
      verification: verificationResult.data,
      test: testResult
    });

  } catch (error) {
    console.error('❌ Error en endpoint de verificación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();
    
    if (action === 'test-insertion') {
      console.log('🧪 Ejecutando prueba de inserción...');
      const result = await testMultitenantInsertion();
      return NextResponse.json(result);
    }
    
    if (action === 'verify-connections') {
      console.log('🔍 Ejecutando verificación de conexiones...');
      const result = await verifyMultitenantConnections();
      return NextResponse.json(result);
    }

    return NextResponse.json({
      success: false,
      error: 'Acción no válida. Use: test-insertion o verify-connections'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error en POST de verificación:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}






