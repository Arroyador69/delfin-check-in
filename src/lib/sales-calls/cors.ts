import { NextRequest, NextResponse } from 'next/server';
import { publicCorsHeaders } from '@/lib/cors-allowlist';

export function salesCallCors(req: NextRequest | Request): Record<string, string> {
  const origin =
    req instanceof NextRequest
      ? req.headers.get('origin')
      : req.headers.get('origin');
  return {
    ...publicCorsHeaders(origin),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export function salesCallOptions(req: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: salesCallCors(req),
  });
}

export function jsonWithSalesCallCors(
  req: NextRequest | Request,
  body: unknown,
  init?: { status?: number }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: salesCallCors(req),
  });
}
