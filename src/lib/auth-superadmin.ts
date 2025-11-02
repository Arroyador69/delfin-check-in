import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function verifySuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;

  if (!authToken) {
    return {
      error: NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      ),
      payload: null
    };
  }

  const payload = verifyToken(authToken);

  if (!payload || !payload.isPlatformAdmin) {
    return {
      error: NextResponse.json(
        { error: 'Acceso denegado. Se requiere permisos de SuperAdmin' },
        { status: 403 }
      ),
      payload: null
    };
  }

  return {
    error: null,
    payload
  };
}

