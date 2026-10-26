/**
 * Flujo B/C: lugares ES para descubrir webs propias (rural + costa + ciudades).
 * ~300k VUT en España: muchas sin web propia (solo Airbnb), pero OSM + semillas
 * deben cubrir miles de webs locales. Ver CAPTACION_FLUJO_B / META_20.
 */

export const SPAIN_RURAL_PLACES: readonly string[] = [
  // Galicia
  'Ourense',
  'Allariz',
  'Ribadavia',
  'Ribadeo',
  'Viveiro',
  'Mondariz',
  'Combarro',
  'Tui',
  'Verín',
  'Monforte de Lemos',
  'Santiago de Compostela',
  'A Coruña',
  'Vigo',
  'Pontevedra',
  'Sanxenxo',
  'Baiona',
  // Asturias
  'Llanes',
  'Cangas de Onís',
  'Somiedo',
  'Taramundi',
  'Cudillero',
  'Lastres',
  'Gijón',
  'Oviedo',
  'Ribadesella',
  // Cantabria / Norte
  'Liébana',
  'Santillana del Mar',
  'Potes',
  'Cabuérniga',
  'Santander',
  'Comillas',
  'Laredo',
  'San Sebastián',
  'Bilbao',
  'Getaria',
  'Hondarribia',
  // Interior / Castilla
  'Hoces del Duratón',
  'Pedraza',
  'Sepúlveda',
  'La Alberca',
  'Candelario',
  'Riaza',
  'Segovia',
  'Ávila',
  'Salamanca',
  'Toledo',
  'Cuenca',
  // Aragón / Pirineo
  'Jaca',
  'Benasque',
  'Aínsa',
  'Ansó',
  'Zaragoza',
  'Huesca',
  // Cataluña
  'La Garrotxa',
  'Ripoll',
  'Berga',
  'Priorat',
  'Barcelona',
  'Girona',
  'Tarragona',
  'Sitges',
  'Cadaqués',
  'Lloret de Mar',
  'Salou',
  'Lleida',
  // Extremadura / Andalucía
  'Jerte',
  'Guadalupe',
  'Grazalema',
  'Ronda',
  'Cazorla',
  'Alpujarras',
  'Zahara de la Sierra',
  'Sevilla',
  'Córdoba',
  'Granada',
  'Málaga',
  'Marbella',
  'Nerja',
  'Torremolinos',
  'Cádiz',
  'Jerez de la Frontera',
  'Tarifa',
  'Almería',
  'Roquetas de Mar',
  'Huelva',
  'Jaén',
  // Valencia / Murcia / Costa Blanca
  'Morella',
  'Albarracín',
  'Moratalla',
  'Valencia',
  'Alicante',
  'Benidorm',
  'Denia',
  'Jávea',
  'Calpe',
  'Torrevieja',
  'Murcia',
  'Cartagena',
  'Águilas',
  // Baleares / Canarias
  'Palma',
  'Alcúdia',
  'Sóller',
  'Ibiza',
  'Santa Eulalia del Río',
  'Ciutadella',
  'Mahón',
  'Las Palmas de Gran Canaria',
  'Maspalomas',
  'Puerto del Carmen',
  'Playa Blanca',
  'Adeje',
  'Puerto de la Cruz',
  'Corralejo',
  // Madrid / centro
  'Madrid',
  'Aranjuez',
  'Chinchón',
  'Alcalá de Henares',
];

/** Plantillas de búsqueda (se sustituye {lugar}). */
export const PLACE_SEARCH_QUERIES: readonly string[] = [
  'casa rural {lugar} contacto',
  'casa rural {lugar} reservas email',
  'turismo rural {lugar} alojamiento web',
  'pazo {lugar} alquiler',
  'cortijo {lugar} turismo rural',
];

export function buildPlaceQueries(place: string, limit = 3): string[] {
  return PLACE_SEARCH_QUERIES.slice(0, limit).map((q) =>
    q.replace(/\{lugar\}/g, place)
  );
}

/** Elige un lote rotativo de lugares (estable por día UTC). */
export function pickPlacesForRun(count: number, dayOffset = 0): string[] {
  const day = Math.floor(Date.now() / 86_400_000) + dayOffset;
  const start = (day * 7) % SPAIN_RURAL_PLACES.length;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(SPAIN_RURAL_PLACES[(start + i) % SPAIN_RURAL_PLACES.length]);
  }
  return out;
}
