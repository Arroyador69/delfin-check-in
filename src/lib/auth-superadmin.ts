import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';

export async function verifySuperAdmin(req: NextRequest) {
  let authToken = req.cookies.get('auth_token')?.value;
  const bearer = req.headers.get('authorization');
  if (!authToken && bearer?.startsWith('Bearer ')) {
    authToken = bearer.slice(7).trim();
  }

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

  if (!isEffectiveSuperAdminPayload(payload)) {
    return {
      error: NextResponse.json(
        {
          error: 'Acceso denegado. SuperAdmin de plataforma solo para la cuenta operativa autorizada.',
        },
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

