export type TenantDuplicateGroup = {
  key: string;
  reason: 'email_local' | 'name';
  tenants: Array<{ id: string; email: string; name: string; plan_type?: string | null }>;
};

function normalizeLocalPart(email: string): string {
  return email.trim().toLowerCase().split('@')[0]?.replace(/[^a-z0-9]/g, '') || '';
}

function normalizeName(name: string): string {
  const first = name.trim().toLowerCase().split(/\s+/)[0] || '';
  return first.replace(/[^a-zà-ÿ]/g, '');
}

function localsSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5) return false;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return longer.startsWith(shorter);
}

/**
 * Agrupa tenants que podrían ser la misma persona (email local similar o mismo nombre).
 */
export function findTenantDuplicateGroups(
  rows: Array<{ id: string; email: string; name: string; plan_type?: string | null }>
): TenantDuplicateGroup[] {
  const byLocal = new Map<string, TenantDuplicateGroup['tenants']>();
  const byName = new Map<string, TenantDuplicateGroup['tenants']>();
  const allRows: TenantDuplicateGroup['tenants'] = [];

  for (const row of rows) {
    const email = String(row.email || '').trim().toLowerCase();
    const name = String(row.name || '').trim();
    if (!email) continue;
    const entry = { id: row.id, email, name, plan_type: row.plan_type };
    allRows.push(entry);

    const local = normalizeLocalPart(email);
    if (local.length >= 5) {
      const list = byLocal.get(local) || [];
      list.push(entry);
      byLocal.set(local, list);
    }

    const nKey = normalizeName(name);
    if (nKey.length >= 4) {
      const list = byName.get(nKey) || [];
      list.push(entry);
      byName.set(nKey, list);
    }
  }

  const groups: TenantDuplicateGroup[] = [];
  const seen = new Set<string>();

  const pushGroup = (reason: TenantDuplicateGroup['reason'], key: string, tenants: TenantDuplicateGroup['tenants']) => {
    const uniqueEmails = new Set(tenants.map((t) => t.email));
    if (uniqueEmails.size < 2) return;
    const sig = tenants
      .map((t) => t.id)
      .sort()
      .join(',');
    if (seen.has(sig)) return;
    seen.add(sig);
    groups.push({ key, reason, tenants });
  };

  for (const [key, tenants] of byLocal) {
    pushGroup('email_local', key, tenants);
  }

  // Emails locales parecidos (gabbyfrancy vs gabbyfrancy67) — solo dentro del mismo prefijo
  const prefixBuckets = new Map<string, TenantDuplicateGroup['tenants']>();
  for (const entry of allRows) {
    const local = normalizeLocalPart(entry.email);
    const prefix = local.slice(0, 6);
    if (prefix.length < 5) continue;
    const list = prefixBuckets.get(prefix) || [];
    list.push(entry);
    prefixBuckets.set(prefix, list);
  }
  for (const bucket of prefixBuckets.values()) {
    if (bucket.length < 2) continue;
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const a = bucket[i];
        const b = bucket[j];
        const la = normalizeLocalPart(a.email);
        const lb = normalizeLocalPart(b.email);
        if (localsSimilar(la, lb)) {
          pushGroup('email_local', `${la}~${lb}`, [a, b]);
        }
      }
    }
  }

  for (const [key, tenants] of byName) {
    pushGroup('name', key, tenants);
  }

  return groups.sort((a, b) => b.tenants.length - a.tenants.length);
}
