import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Test de certificado MIR...');
    
    const certPath = path.join(process.cwd(), 'mir-server-cert.pem');
    console.log('📁 Ruta del certificado:', certPath);
    
    const certExists = fs.existsSync(certPath);
    console.log('📄 Certificado existe:', certExists);
    
    if (certExists) {
      const certContent = fs.readFileSync(certPath, 'utf8');
      const certSize = certContent.length;
      const certStart = certContent.substring(0, 100);
      const certEnd = certContent.substring(certContent.length - 100);
      
      console.log('📊 Tamaño del certificado:', certSize, 'bytes');
      console.log('🔍 Inicio del certificado:', certStart);
      console.log('🔍 Final del certificado:', certEnd);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Certificado MIR encontrado y cargado',
        certificado: {
          ruta: certPath,
          existe: certExists,
          tamaño: certSize,
          inicio: certStart,
          final: certEnd
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'Certificado MIR no encontrado',
        certificado: {
          ruta: certPath,
          existe: certExists
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Error en test de certificado:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test de certificado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
