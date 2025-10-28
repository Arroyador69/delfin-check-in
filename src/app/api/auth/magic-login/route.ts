import { NextRequest, NextResponse } from 'next/server'

// Nota: En producción, validaríamos el token contra BD y mapearíamos tenant_id
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    // Simular validación y extracción de tenant_id
    // token esperado: tenant_<id>__<random> (solo ejemplo)
    const tenantId = token.startsWith('tenant_') ? token.split('__')[0].replace('tenant_', '') : ''
    if (!tenantId) {
      return NextResponse.json({ error: 'Token no válido' }, { status: 401 })
    }

    const res = NextResponse.json({ success: true })
    res.cookies.set('auth_tenant', tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error' }, { status: 500 })
  }
}


