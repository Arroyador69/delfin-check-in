/**
 * Centros lat/lon para Overpass `around:` (más fiable que area=name).
 * Cubre costa + ciudades + rural ES.
 */
export type PlaceCoord = { name: string; lat: number; lon: number; radiusM?: number };

export const SPAIN_PLACE_COORDS: readonly PlaceCoord[] = [
  // Galicia
  { name: 'Santiago de Compostela', lat: 42.8805, lon: -8.5456, radiusM: 18000 },
  { name: 'A Coruña', lat: 43.3623, lon: -8.4115, radiusM: 15000 },
  { name: 'Vigo', lat: 42.2406, lon: -8.7207, radiusM: 15000 },
  { name: 'Sanxenxo', lat: 42.3997, lon: -8.8069, radiusM: 12000 },
  { name: 'Ribadeo', lat: 43.537, lon: -7.0405, radiusM: 12000 },
  { name: 'Ourense', lat: 42.3358, lon: -7.8639, radiusM: 12000 },
  // Asturias / Cantabria / País Vasco
  { name: 'Llanes', lat: 43.4197, lon: -4.7548, radiusM: 12000 },
  { name: 'Gijón', lat: 43.5322, lon: -5.6611, radiusM: 15000 },
  { name: 'Cangas de Onís', lat: 43.3504, lon: -5.128, radiusM: 15000 },
  { name: 'Santander', lat: 43.4623, lon: -3.8099, radiusM: 15000 },
  { name: 'Santillana del Mar', lat: 43.3891, lon: -4.0494, radiusM: 10000 },
  { name: 'San Sebastián', lat: 43.3183, lon: -1.9812, radiusM: 12000 },
  { name: 'Bilbao', lat: 43.263, lon: -2.935, radiusM: 15000 },
  // Interior
  { name: 'Madrid', lat: 40.4168, lon: -3.7038, radiusM: 20000 },
  { name: 'Toledo', lat: 39.8628, lon: -4.0273, radiusM: 10000 },
  { name: 'Segovia', lat: 40.9429, lon: -4.1088, radiusM: 10000 },
  { name: 'Salamanca', lat: 40.9701, lon: -5.6635, radiusM: 10000 },
  { name: 'Zaragoza', lat: 41.6488, lon: -0.8891, radiusM: 15000 },
  { name: 'Jaca', lat: 42.569, lon: -0.5496, radiusM: 15000 },
  // Cataluña
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686, radiusM: 18000 },
  { name: 'Girona', lat: 41.9794, lon: 2.8214, radiusM: 12000 },
  { name: 'Sitges', lat: 41.2372, lon: 1.8059, radiusM: 10000 },
  { name: 'Cadaqués', lat: 42.2886, lon: 3.2761, radiusM: 8000 },
  { name: 'Lloret de Mar', lat: 41.6999, lon: 2.8458, radiusM: 10000 },
  { name: 'Tarragona', lat: 41.1189, lon: 1.2445, radiusM: 12000 },
  // Valencia / Murcia
  { name: 'Valencia', lat: 39.4699, lon: -0.3763, radiusM: 15000 },
  { name: 'Alicante', lat: 38.3452, lon: -0.481, radiusM: 15000 },
  { name: 'Benidorm', lat: 38.5411, lon: -0.1225, radiusM: 12000 },
  { name: 'Denia', lat: 38.8408, lon: 0.1057, radiusM: 12000 },
  { name: 'Torrevieja', lat: 37.9787, lon: -0.6822, radiusM: 12000 },
  { name: 'Murcia', lat: 37.9922, lon: -1.1307, radiusM: 12000 },
  { name: 'Cartagena', lat: 37.6056, lon: -0.9911, radiusM: 12000 },
  // Andalucía
  { name: 'Sevilla', lat: 37.3891, lon: -5.9845, radiusM: 15000 },
  { name: 'Córdoba', lat: 37.8882, lon: -4.7794, radiusM: 12000 },
  { name: 'Granada', lat: 37.1773, lon: -3.5986, radiusM: 15000 },
  { name: 'Málaga', lat: 36.7213, lon: -4.4214, radiusM: 15000 },
  { name: 'Marbella', lat: 36.5101, lon: -4.8824, radiusM: 15000 },
  { name: 'Nerja', lat: 36.7469, lon: -3.876, radiusM: 10000 },
  { name: 'Torremolinos', lat: 36.6226, lon: -4.4996, radiusM: 10000 },
  { name: 'Cádiz', lat: 36.5271, lon: -6.2886, radiusM: 12000 },
  { name: 'Tarifa', lat: 36.0143, lon: -5.6044, radiusM: 12000 },
  { name: 'Ronda', lat: 36.7422, lon: -5.167, radiusM: 12000 },
  { name: 'Almería', lat: 36.834, lon: -2.4637, radiusM: 12000 },
  // Baleares / Canarias
  { name: 'Palma', lat: 39.5696, lon: 2.6502, radiusM: 18000 },
  { name: 'Alcúdia', lat: 39.853, lon: 3.124, radiusM: 12000 },
  { name: 'Ibiza', lat: 38.9067, lon: 1.4206, radiusM: 15000 },
  { name: 'Ciutadella', lat: 40.0011, lon: 3.8414, radiusM: 12000 },
  { name: 'Las Palmas', lat: 28.1235, lon: -15.4363, radiusM: 15000 },
  { name: 'Maspalomas', lat: 27.7606, lon: -15.586, radiusM: 12000 },
  { name: 'Adeje', lat: 28.1227, lon: -16.724, radiusM: 12000 },
  { name: 'Puerto del Carmen', lat: 28.922, lon: -13.665, radiusM: 10000 },
  { name: 'Corralejo', lat: 28.742, lon: -13.867, radiusM: 10000 },
];

/**
 * Lote rotativo por día + oleada (cambia solo: mañana/tarde/noche ≠ mismas zonas).
 * waveOffset: 0 mañana, 1 tarde, 2 noche, 3 prepare.
 */
export function pickPlaceCoordsForRun(
  count: number,
  dayOffset = 0,
  waveOffset = 0
): PlaceCoord[] {
  const day = Math.floor(Date.now() / 86_400_000) + dayOffset;
  const start = (day * 7 + waveOffset * 11) % SPAIN_PLACE_COORDS.length;
  const out: PlaceCoord[] = [];
  for (let i = 0; i < count && i < SPAIN_PLACE_COORDS.length; i++) {
    out.push(SPAIN_PLACE_COORDS[(start + i) % SPAIN_PLACE_COORDS.length]!);
  }
  return out;
}
