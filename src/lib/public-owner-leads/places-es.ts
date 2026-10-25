/**
 * Flujo B: lugares de España para descubrir webs propias de alquiler vacacional.
 * Ver docs/growth/CAPTACION_FLUJO_B_POR_LUGARES.md
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
  // Asturias
  'Llanes',
  'Cangas de Onís',
  'Somiedo',
  'Taramundi',
  'Cudillero',
  'Lastres',
  // Cantabria / Norte
  'Liébana',
  'Santillana del Mar',
  'Potes',
  'Cabuérniga',
  // Interior / Castilla
  'Hoces del Duratón',
  'Pedraza',
  'Sepúlveda',
  'La Alberca',
  'Candelario',
  'Riaza',
  // Aragón / Pirineo
  'Jaca',
  'Benasque',
  'Aínsa',
  'Ansó',
  // Cataluña interior
  'La Garrotxa',
  'Ripoll',
  'Berga',
  'Priorat',
  // Extremadura / Andalucía rural
  'Jerte',
  'Guadalupe',
  'Grazalema',
  'Ronda',
  'Cazorla',
  'Alpujarras',
  'Zahara de la Sierra',
  // Valencia / Murcia interior
  'Morella',
  'Albarracín',
  'Moratalla',
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
