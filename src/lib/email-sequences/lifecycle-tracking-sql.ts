/** Condición SQL: fila de email_tracking pertenece a lifecycle. */
export const LIFECYCLE_ET_WHERE = `(
  et.metadata @> '{"lifecycle":true}'::jsonb
  OR et.metadata->>'lifecycle' = 'true'
)`;

/** Condición SQL: email considerado abierto/clicado. */
export const LIFECYCLE_ET_OPENED = `(
  et.opened_at IS NOT NULL
  OR et.clicked_at IS NOT NULL
  OR et.status IN ('opened', 'clicked')
  OR COALESCE(et.opened_count, 0) > 0
)`;

export const LIFECYCLE_ET2_OPENED = LIFECYCLE_ET_OPENED.replace(/et\./g, 'et2.');
