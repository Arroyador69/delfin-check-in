/**
 * 🔧 Error Handler Wrapper
 * 
 * Wrapper para capturar errores automáticamente en las API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { captureErrorWithContext } from '@/lib/sentry-helper'
import { verifyToken } from '@/lib/auth'

/**
 * Obtener tenant ID y user ID del request
 */
function getContextFromRequest(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value
  let tenantId: string | undefined
  let userId: string | undefined

  if (authToken) {
    try {
      const payload = verifyToken(authToken)
      tenantId = payload?.tenantId
      userId = payload?.userId
    } catch {
      // Ignorar errores de token
    }
  }

  return {
    tenantId,
    userId,
    url: req.url,
  }
}

/**
 * Wrapper para API routes que captura errores automáticamente
 */
export function withErrorHandling(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(req)
    } catch (error) {
      const context = getContextFromRequest(req)
      
      // Capturar error en Sentry y DB
      await captureErrorWithContext(
        error instanceof Error ? error : new Error(String(error)),
        {
          tenantId: context.tenantId,
          userId: context.userId,
          url: context.url || undefined,
          extra: {
            method: req.method,
            path: req.nextUrl.pathname,
          },
        }
      )

      // Retornar error al cliente
      if (error instanceof Error) {
        return NextResponse.json(
          { 
            error: error.message || 'Error interno del servidor',
            ...(process.env.NODE_ENV === 'development' && {
              stack: error.stack,
            }),
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

