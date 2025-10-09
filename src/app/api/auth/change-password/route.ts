import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, hashPassword, verifyToken, AUTH_CONFIG } from '@/lib/auth';

/**
 * 🔐 API DE CAMBIO DE CONTRASEÑA
 * 
 * Permite cambiar la contraseña del administrador
 * - Verifica la contraseña actual
 * - Hashea la nueva contraseña con bcrypt
 * - Actualiza el .env (requiere reinicio del servidor)
 * 
 * NOTA: En un sistema real, esto actualizaría una base de datos.
 * Para este sistema, genera un nuevo hash que debe copiarse al .env
 */

export async function POST(req: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const payload = verifyToken(authToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Obtener datos del request
    const { currentPassword, newPassword } = await req.json();

    // Validaciones
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          error: 'Datos incompletos',
          message: 'Debes proporcionar la contraseña actual y la nueva'
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { 
          error: 'Contraseña débil',
          message: 'La nueva contraseña debe tener al menos 8 caracteres'
        },
        { status: 400 }
      );
    }

    // Verificar contraseña actual
    const adminSecretHash = process.env.ADMIN_SECRET_HASH;
    
    if (!adminSecretHash) {
      return NextResponse.json(
        { error: 'Configuración incorrecta del servidor' },
        { status: 500 }
      );
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, adminSecretHash);
    
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { 
          error: 'Contraseña incorrecta',
          message: 'La contraseña actual es incorrecta'
        },
        { status: 401 }
      );
    }

    // Generar hash de la nueva contraseña
    const newPasswordHash = await hashPassword(newPassword);

    // En un sistema real, aquí actualizarías la base de datos
    // Por ahora, retornamos el hash para que el admin lo copie al .env
    
    console.log('🔐 Nueva contraseña hasheada:', newPasswordHash);

    return NextResponse.json({ 
      success: true,
      message: 'Hash generado correctamente',
      instructions: 'Por favor, actualiza ADMIN_SECRET_HASH en tu archivo .env con el siguiente valor y reinicia el servidor.',
      newHash: newPasswordHash
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: 'No se pudo cambiar la contraseña'
      },
      { status: 500 }
    );
  }
}

