/** Utilidades para listar propiedades sin duplicados placeholder / borrador. */

export type TenantPropertyRow = {
  id: number | null;
  property_name: string;
  description?: string | null;
  photos?: unknown;
  base_price?: number;
  room_id?: string | null;
  is_placeholder?: boolean;
  updated_at?: string | Date | null;
  created_at?: string | Date | null;
  google_review_url?: string | null;
};

export function normalizePropertyName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mayor = propiedad más completa (la que creó el usuario, no el stub €50). */
export function propertyCompletenessScore(p: TenantPropertyRow): number {
  let s = 0;
  if (p.id != null) s += 1000;
  if (p.room_id) s += 200;
  const photos = p.photos;
  if (Array.isArray(photos) && photos.length > 0) s += 100;
  if (p.description && String(p.description).trim()) s += 20;
  if (Number(p.base_price) !== 50) s += 15;
  if (p.google_review_url && String(p.google_review_url).trim()) s += 10;
  const t = p.updated_at || p.created_at;
  if (t) s += new Date(t).getTime() / 1e12;
  return s;
}

function isStubProperty(p: TenantPropertyRow): boolean {
  if (p.id == null || p.is_placeholder) return true;
  const photos = p.photos;
  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  const hasDesc = Boolean(p.description && String(p.description).trim());
  const defaultPrice = Number(p.base_price) === 50;
  return !hasPhotos && !hasDesc && defaultPrice && !p.room_id;
}

/** IDs de fichas stub en BD (€50 sin fotos) duplicadas por nombre — candidatas a borrar. */
export function findDuplicateStubPropertyIds(properties: TenantPropertyRow[]): number[] {
  const real = properties.filter((p) => p.id != null && !p.is_placeholder);
  const bestRealByNorm = new Map<string, TenantPropertyRow>();
  for (const p of real) {
    const nn = normalizePropertyName(p.property_name);
    const prev = bestRealByNorm.get(nn);
    if (!prev || propertyCompletenessScore(p) > propertyCompletenessScore(prev)) {
      bestRealByNorm.set(nn, p);
    }
  }
  const toDelete: number[] = [];
  for (const p of real) {
    if (p.id == null) continue;
    const nn = normalizePropertyName(p.property_name);
    const winner = bestRealByNorm.get(nn);
    if (!winner?.id || winner.id === p.id) continue;
    if (isStubProperty(p) && propertyCompletenessScore(winner) > propertyCompletenessScore(p)) {
      toDelete.push(p.id);
    }
  }
  return toDelete;
}

/**
 * Elimina placeholders virtuales y duplicados por nombre de habitación.
 * Mantiene la ficha más completa (fotos, precio real, mapping).
 */
export function dedupeTenantPropertiesList<T extends TenantPropertyRow>(properties: T[]): T[] {
  const real = properties.filter((p) => p.id != null && !p.is_placeholder);

  const bestRealByNorm = new Map<string, T>();
  const bestRealByRoom = new Map<string, T>();
  for (const p of real) {
    const nn = normalizePropertyName(p.property_name);
    const prevN = bestRealByNorm.get(nn);
    if (!prevN || propertyCompletenessScore(p) > propertyCompletenessScore(prevN)) {
      bestRealByNorm.set(nn, p);
    }
    if (p.room_id) {
      const rid = String(p.room_id);
      const prevR = bestRealByRoom.get(rid);
      if (!prevR || propertyCompletenessScore(p) > propertyCompletenessScore(prevR)) {
        bestRealByRoom.set(rid, p);
      }
    }
  }

  const keptReal = new Map<number, T>();
  for (const p of bestRealByNorm.values()) {
    if (p.id != null) keptReal.set(p.id, p);
  }

  // Quitar stubs reales en BD (€50 sin fotos) si hay otra ficha mejor con el mismo nombre
  for (const p of real) {
    if (p.id == null) continue;
    const nn = normalizePropertyName(p.property_name);
    const winner = bestRealByNorm.get(nn);
    if (!winner?.id || winner.id === p.id) continue;
    if (isStubProperty(p) && propertyCompletenessScore(winner) > propertyCompletenessScore(p)) {
      keptReal.delete(p.id);
    }
  }

  return Array.from(keptReal.values()).sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
}
