/**
 * Rotación automática por provincia (España).
 * Cada oleada del día usa un bloque distinto → stock nuevo sin repetir.
 */

export const SPAIN_PROVINCES: readonly string[] = [
  'A Coruña',
  'Lugo',
  'Ourense',
  'Pontevedra',
  'Asturias',
  'Cantabria',
  'Bizkaia',
  'Gipuzkoa',
  'Araba',
  'Navarra',
  'La Rioja',
  'Huesca',
  'Zaragoza',
  'Teruel',
  'Barcelona',
  'Girona',
  'Lleida',
  'Tarragona',
  'Castellón',
  'Valencia',
  'Alicante',
  'Murcia',
  'Madrid',
  'Ávila',
  'Segovia',
  'Soria',
  'Burgos',
  'Palencia',
  'Valladolid',
  'León',
  'Zamora',
  'Salamanca',
  'Toledo',
  'Ciudad Real',
  'Cuenca',
  'Guadalajara',
  'Albacete',
  'Cáceres',
  'Badajoz',
  'Sevilla',
  'Córdoba',
  'Jaén',
  'Granada',
  'Málaga',
  'Cádiz',
  'Huelva',
  'Almería',
  'Illes Balears',
  'Las Palmas',
  'Santa Cruz de Tenerife',
];

/** Índice de provincia según día UTC + oleada (0 mañana … 3 cierre 20h, 4 prepare). */
export function provinceIndexForWave(
  wave: 'morning' | 'afternoon' | 'evening' | 'night' | 'prepare',
  dayOffset = 0
): number {
  const day = Math.floor(Date.now() / 86_400_000) + dayOffset;
  const waveN =
    wave === 'afternoon'
      ? 1
      : wave === 'evening'
        ? 2
        : wave === 'night'
          ? 3
          : wave === 'prepare'
            ? 4
            : 0;
  return (day * 5 + waveN) % SPAIN_PROVINCES.length;
}

export function provincesForWave(
  wave: 'morning' | 'afternoon' | 'evening' | 'night' | 'prepare',
  count = 4
): string[] {
  const start = provinceIndexForWave(wave);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(SPAIN_PROVINCES[(start + i) % SPAIN_PROVINCES.length]!);
  }
  return out;
}
