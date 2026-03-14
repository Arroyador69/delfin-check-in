import { NextRequest, NextResponse } from 'next/server';

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  launchYear: number | null;
  types: string[];
}

interface HolidayResult {
  date: string;
  name: string;
  localName: string;
  global: boolean;
  counties: string[] | null;
  types: string[];
}

const COMMUNITY_NAMES: Record<string, string> = {
  'ES-AN': 'Andalucía',
  'ES-AR': 'Aragón',
  'ES-AS': 'Asturias',
  'ES-CB': 'Cantabria',
  'ES-CE': 'Ceuta',
  'ES-CL': 'Castilla y León',
  'ES-CM': 'Castilla-La Mancha',
  'ES-CN': 'Canarias',
  'ES-CT': 'Cataluña',
  'ES-EX': 'Extremadura',
  'ES-GA': 'Galicia',
  'ES-IB': 'Islas Baleares',
  'ES-MC': 'Murcia',
  'ES-MD': 'Madrid',
  'ES-ML': 'Melilla',
  'ES-NC': 'Navarra',
  'ES-PV': 'País Vasco',
  'ES-RI': 'La Rioja',
  'ES-VC': 'Comunidad Valenciana',
};

const holidayCache = new Map<string, { data: HolidayResult[]; fetchedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const community = searchParams.get('community') || null; // e.g. ES-AN
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : null;

    const years = months && months > 12
      ? [year, year + 1]
      : [year];

    let allHolidays: HolidayResult[] = [];

    for (const y of years) {
      const cacheKey = `ES-${y}`;
      const cached = holidayCache.get(cacheKey);

      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        allHolidays.push(...cached.data);
        continue;
      }

      const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/ES`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 },
      });

      if (!response.ok) {
        console.error(`Nager API error for ${y}: ${response.status}`);
        continue;
      }

      const raw: NagerHoliday[] = await response.json();
      const holidays: HolidayResult[] = raw.map(h => ({
        date: h.date,
        name: h.name,
        localName: h.localName,
        global: h.global,
        counties: h.counties,
        types: h.types,
      }));

      holidayCache.set(cacheKey, { data: holidays, fetchedAt: Date.now() });
      allHolidays.push(...holidays);
    }

    if (community) {
      allHolidays = allHolidays.filter(
        h => h.global || (h.counties && h.counties.includes(community))
      );
    }

    if (months) {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + months);
      allHolidays = allHolidays.filter(h => {
        const d = new Date(h.date);
        return d >= now && d <= end;
      });
    }

    allHolidays.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      holidays: allHolidays,
      communities: COMMUNITY_NAMES,
    });
  } catch (error) {
    console.error('[market/holidays] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
