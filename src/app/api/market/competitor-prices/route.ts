import { NextRequest, NextResponse } from 'next/server';
import { getMarketData } from '@/lib/dynamic-pricing';

/**
 * GET /api/market/competitor-prices?zone=...&from=YYYY-MM-DD&to=YYYY-MM-DD&roomType=standard
 * Devuelve media y percentiles (p25, p40, p50, p75) de precios de competencia por fecha para la zona indicada.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zone = searchParams.get('zone')?.trim() || null;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const roomType = searchParams.get('roomType') || 'standard';

    if (!from || !to) {
      return NextResponse.json(
        { success: false, error: 'Parámetros requeridos: from, to (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const start = new Date(from);
    const end = new Date(to);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Formato de fecha inválido' },
        { status: 400 }
      );
    }
    if (start > end) {
      return NextResponse.json(
        { success: false, error: 'La fecha from debe ser anterior a to' },
        { status: 400 }
      );
    }

    if (!zone) {
      return NextResponse.json(
        { success: false, error: 'Indica la zona (parámetro zone)' },
        { status: 400 }
      );
    }

    const data = await getMarketData(from, to, roomType, zone);

    const avgP40 = data.length
      ? data.reduce((s, d) => s + (d.p40 ?? 0), 0) / data.length
      : null;
    const avgP50 = data.length
      ? data.reduce((s, d) => s + (d.p50 ?? 0), 0) / data.length
      : null;

    return NextResponse.json({
      success: true,
      data,
      meta: {
        zone,
        from,
        to,
        roomType,
        totalDays: data.length,
        avgP40: avgP40 != null ? Math.round(avgP40 * 100) / 100 : null,
        avgP50: avgP50 != null ? Math.round(avgP50 * 100) / 100 : null,
        avgSampleSize:
          data.length > 0
            ? Math.round(
                data.reduce((sum, d) => sum + (d.sampleSize ?? 0), 0) / data.length
              )
            : 0,
      },
    });
  } catch (error) {
    console.error('[market/competitor-prices] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
