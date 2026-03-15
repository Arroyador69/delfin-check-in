import { NextResponse } from 'next/server';
import { getAvailableZones } from '@/lib/dynamic-pricing';

/**
 * GET /api/market/zones
 * Devuelve la lista de zonas con datos de precios de competencia (para selector en Market Intelligence).
 */
export async function GET() {
  try {
    const zones = await getAvailableZones();
    return NextResponse.json({ success: true, zones });
  } catch (error) {
    console.error('[market/zones] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
