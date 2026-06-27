/** Neon/Postgres DECIMAL suele llegar como string en JSON. */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatPercent(value: unknown, decimals = 0): string {
  return `${toFiniteNumber(value).toFixed(decimals)}%`;
}
