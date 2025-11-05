/**
 * API v2 - Validación pre-envío usando adapters
 * 
 * Este endpoint permite validar datos antes de enviarlos.
 * Por ahora es un placeholder para el futuro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/adapters';
import { CheckInPayload } from '@/lib/adapters/base/types';

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

export async function POST(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const adapterKey = params.key;
    const adapter = getAdapter(adapterKey);

    if (!adapter) {
      return NextResponse.json(
        {
          error: `Adapter no encontrado: ${adapterKey}`,
        },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const payload: CheckInPayload = await req.json();
    const validationResult = adapter.validate(payload);

    return NextResponse.json(
      {
        valid: validationResult.valid,
        errors: validationResult.errors,
      },
      {
        status: validationResult.valid ? 200 : 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

