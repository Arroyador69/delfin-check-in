/**
 * Importa leads desde datos abiertos ES → queued.
 * Compat: JCyL + multi-CCAA (GVA, etc.). Ver discover-opendata-multi.ts.
 */

import {
  importAllOpenDataToQueue,
  importOpenDataSource,
  OPENDATA_SOURCES,
} from './discover-opendata-multi';

export const JCYL_TURISMO_RURAL_CSV = OPENDATA_SOURCES.jcyl.url;

/** @deprecated Prefer importAllOpenDataToQueue — se mantiene por scripts legacy. */
export async function importJcylOpenDataToQueue(opts?: {
  limit?: number;
  csvText?: string;
}): Promise<{
  queued: number;
  skipped: number;
  queuedTotal: number;
  source: string;
}> {
  // csvText legacy: si alguien pasa texto, usamos solo JCyL vía fuente remota
  // (el path multi ya descarga; csvText se ignora en multi — raro en prod).
  void opts?.csvText;
  const r = await importOpenDataSource({
    sourceId: 'jcyl',
    limit: opts?.limit ?? 80,
    enqueueWebsites: true,
    websiteLimit: Math.max(60, opts?.limit ?? 80),
  });
  return {
    queued: r.queued,
    skipped: r.skipped,
    queuedTotal: r.queuedTotal,
    source: r.source,
  };
}

export { importAllOpenDataToQueue, importOpenDataSource, OPENDATA_SOURCES };
