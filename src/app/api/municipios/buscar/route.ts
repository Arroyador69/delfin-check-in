import { NextRequest, NextResponse } from 'next/server';

// Catálogo local como fallback
const MUNICIPIOS_FALLBACK = [
  {c:'29067',n:'Málaga',p:'Málaga'},{c:'29042',n:'Fuengirola',p:'Málaga'},{c:'29069',n:'Marbella',p:'Málaga'},
  {c:'29094',n:'Torremolinos',p:'Málaga'},{c:'29015',n:'Benalmádena',p:'Málaga'},{c:'29054',n:'Mijas',p:'Málaga'},
  {c:'28079',n:'Madrid',p:'Madrid'},{c:'28065',n:'Móstoles',p:'Madrid'},{c:'28047',n:'Alcalá de Henares',p:'Madrid'},
  {c:'08019',n:'Barcelona',p:'Barcelona'},{c:'08101',n:'Hospitalet de Llobregat',p:'Barcelona'},{c:'08015',n:'Badalona',p:'Barcelona'},
  {c:'46250',n:'Valencia',p:'Valencia'},{c:'41091',n:'Sevilla',p:'Sevilla'},{c:'03014',n:'Alicante',p:'Alicante'},
  {c:'50297',n:'Zaragoza',p:'Zaragoza'},{c:'48020',n:'Bilbao',p:'Bizkaia'},{c:'33044',n:'Oviedo',p:'Asturias'},
  {c:'30030',n:'Murcia',p:'Murcia'},{c:'35016',n:'Las Palmas de Gran Canaria',p:'Las Palmas'},
  {c:'18087',n:'Granada',p:'Granada'},{c:'14021',n:'Córdoba',p:'Córdoba'},{c:'47186',n:'Valladolid',p:'Valladolid'},
  {c:'07040',n:'Palma',p:'Illes Balears'},{c:'11012',n:'Cádiz',p:'Cádiz'},{c:'11020',n:'Jerez de la Frontera',p:'Cádiz'},
  {c:'15030',n:'A Coruña',p:'A Coruña'},{c:'01059',n:'Vitoria-Gasteiz',p:'Álava'},{c:'36057',n:'Vigo',p:'Pontevedra'},
  {c:'33024',n:'Gijón',p:'Asturias'},{c:'30016',n:'Cartagena',p:'Murcia'},{c:'38038',n:'Santa Cruz de Tenerife',p:'Santa Cruz de Tenerife'}
];

function buscarLocal(texto: string) {
  if (!texto || texto.length < 2) return MUNICIPIOS_FALLBACK.slice(0, 10);
  const txt = texto.toLowerCase();
  return MUNICIPIOS_FALLBACK.filter(m => 
    m.n.toLowerCase().includes(txt) || 
    m.p.toLowerCase().includes(txt) ||
    m.c.includes(txt)
  ).slice(0, 20);
}

// Función para consultar API externa (GeoAPI o similar)
async function buscarExterna(texto: string): Promise<any[]> {
  try {
    // Intentar con GeoAPI España (si está disponible)
    const response = await fetch(`https://geoapi.es/api/municipios?NMUN=${encodeURIComponent(texto)}&limit=20`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DelfinCheckin/1.0'
      },
      // Timeout de 3 segundos
      signal: AbortSignal.timeout(3000)
    });

    if (!response.ok) {
      throw new Error(`API externa respondió con ${response.status}`);
    }

    const data = await response.json();
    
    // Normalizar respuesta de GeoAPI al formato esperado
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        c: item.codigo_ine || item.ine || item.codigo,
        n: item.nombre || item.name,
        p: item.provincia || item.province
      })).filter((item: any) => item.c && item.n);
    }
    
    return [];
  } catch (error) {
    console.warn('Error consultando API externa de municipios:', error);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    
    if (query.length < 2) {
      return NextResponse.json({
        municipios: MUNICIPIOS_FALLBACK.slice(0, 10),
        fuente: 'local',
        mensaje: 'Búsqueda muy corta, mostrando municipios principales'
      });
    }

    console.log(`🔍 Buscando municipios para: "${query}"`);

    // Intentar API externa primero
    const resultadosExternos = await buscarExterna(query);
    
    if (resultadosExternos.length > 0) {
      console.log(`✅ Encontrados ${resultadosExternos.length} municipios en API externa`);
      return NextResponse.json({
        municipios: resultadosExternos,
        fuente: 'externa',
        mensaje: 'Resultados de API externa'
      });
    }

    // Fallback a búsqueda local
    const resultadosLocales = buscarLocal(query);
    console.log(`⚠️ Usando fallback local: ${resultadosLocales.length} municipios`);
    
    return NextResponse.json({
      municipios: resultadosLocales,
      fuente: 'local',
      mensaje: 'API externa no disponible, usando catálogo local'
    });

  } catch (error) {
    console.error('Error en búsqueda de municipios:', error);
    
    // En caso de error, devolver fallback local
    const query = new URL(req.url).searchParams.get('q') || '';
    const fallback = buscarLocal(query);
    
    return NextResponse.json({
      municipios: fallback,
      fuente: 'local',
      mensaje: 'Error en búsqueda, usando catálogo local',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

// Manejar CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
