import { NextRequest, NextResponse } from 'next/server';

/**
 * Mapeo provincia/estado España -> código comunidad autónoma (Nager.Date)
 * Nominatim devuelve "state" como comunidad o provincia según el resultado.
 */
const PROVINCE_TO_CCAA: Record<string, string> = {
  'almería': 'ES-AN', 'cádiz': 'ES-AN', 'córdoba': 'ES-AN', 'cordoba': 'ES-AN',
  'granada': 'ES-AN', 'huelva': 'ES-AN', 'jaén': 'ES-AN', 'jaen': 'ES-AN',
  'málaga': 'ES-AN', 'malaga': 'ES-AN', 'sevilla': 'ES-AN', 'andalucía': 'ES-AN', 'andalucia': 'ES-AN',
  'huesca': 'ES-AR', 'teruel': 'ES-AR', 'zaragoza': 'ES-AR', 'aragon': 'ES-AR',
  'asturias': 'ES-AS', 'cantabria': 'ES-CB',
  'ávila': 'ES-CL', 'avila': 'ES-CL', 'burgos': 'ES-CL', 'león': 'ES-CL', 'leon': 'ES-CL',
  'palencia': 'ES-CL', 'salamanca': 'ES-CL', 'segovia': 'ES-CL', 'soria': 'ES-CL',
  'valladolid': 'ES-CL', 'zamora': 'ES-CL', 'castilla y león': 'ES-CL', 'castilla y leon': 'ES-CL',
  'albacete': 'ES-CM', 'ciudad real': 'ES-CM', 'cuenca': 'ES-CM', 'guadalajara': 'ES-CM',
  'toledo': 'ES-CM', 'castilla-la mancha': 'ES-CM', 'castilla la mancha': 'ES-CM',
  'barcelona': 'ES-CT', 'girona': 'ES-CT', 'lleida': 'ES-CT', 'lérida': 'ES-CT', 'lerida': 'ES-CT',
  'tarragona': 'ES-CT', 'cataluña': 'ES-CT', 'cataluna': 'ES-CT', 'catalonia': 'ES-CT',
  'badajoz': 'ES-EX', 'cáceres': 'ES-EX', 'caceres': 'ES-EX', 'extremadura': 'ES-EX',
  'a coruña': 'ES-GA', 'a coruna': 'ES-GA', 'lugo': 'ES-GA', 'ourense': 'ES-GA', 'pontevedra': 'ES-GA',
  'galicia': 'ES-GA',
  'islas baleares': 'ES-IB', 'baleares': 'ES-IB', 'illes balears': 'ES-IB', 'balearic islands': 'ES-IB',
  'las palmas': 'ES-CN', 'santa cruz de tenerife': 'ES-CN', 'canarias': 'ES-CN', 'canary islands': 'ES-CN',
  'madrid': 'ES-MD', 'murcia': 'ES-MC', 'navarra': 'ES-NC', 'navarre': 'ES-NC',
  'álava': 'ES-PV', 'alava': 'ES-PV', 'araba': 'ES-PV', 'bizkaia': 'ES-PV', 'vizcaya': 'ES-PV',
  'gipuzkoa': 'ES-PV', 'guipúzcoa': 'ES-PV', 'guipuzcoa': 'ES-PV', 'país vasco': 'ES-PV', 'pais vasco': 'ES-PV',
  'basque country': 'ES-PV', 'la rioja': 'ES-RI', 'rioja': 'ES-RI',
  'alicante': 'ES-VC', 'alicant': 'ES-VC', 'castellón': 'ES-VC', 'castellon': 'ES-VC',
  'valencia': 'ES-VC', 'valència': 'ES-VC', 'comunidad valenciana': 'ES-VC', 'valencian community': 'ES-VC',
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
    .trim();
}

function findCommunity(state: string, city?: string): string {
  const s = normalize(state || '');
  const c = normalize(city || '');
  if (PROVINCE_TO_CCAA[s]) return PROVINCE_TO_CCAA[s];
  if (PROVINCE_TO_CCAA[c]) return PROVINCE_TO_CCAA[c];
  for (const [key, code] of Object.entries(PROVINCE_TO_CCAA)) {
    if (s.includes(key) || c.includes(key)) return code;
  }
  return 'ES'; // nacional por defecto
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Indica al menos 3 caracteres (dirección o localidad)' },
        { status: 400 }
      );
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('countrycodes', 'es');

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DelfinCheckin/1.0 (https://admin.delfincheckin.com)',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      console.error('[market/geocode] Nominatim error:', response.status);
      return NextResponse.json(
        { success: false, error: 'No se pudo buscar la ubicación' },
        { status: 502 }
      );
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        message: 'No se encontraron resultados en España',
      });
    }

    const results = data.map((item: any) => {
      const addr = item.address || {};
      const state = addr.state || addr.province || addr.region || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const community = findCommunity(state, city);
      return {
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        city: city || addr.city_district || '',
        province: state,
        postcode: addr.postcode || '',
        country: addr.country || 'España',
        community,
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('[market/geocode] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
