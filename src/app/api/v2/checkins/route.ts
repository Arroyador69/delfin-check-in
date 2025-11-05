/**
 * API v2 - Endpoint de check-ins usando adapters
 * 
 * Este endpoint es un placeholder para el futuro. Por ahora NO se usa,
 * pero la estructura está lista para cuando se implemente el siguiente país.
 * 
 * El endpoint actual sigue siendo /api/public/form/[slug]/submit (v1)
 */

import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  // TODO: Implementar cuando se añada el siguiente país
  // Por ahora retorna un error indicando que aún no está implementado
  
  return NextResponse.json(
    {
      error: 'API v2 aún no está implementada. Use /api/public/form/[slug]/submit para envíos.',
      version: 'v2',
      status: 'not_implemented',
    },
    {
      status: 501, // Not Implemented
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}

