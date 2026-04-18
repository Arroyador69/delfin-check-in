/**
 * @vercel/postgres tipa interpolaciones como `Primitive` y excluye `string[]`,
 * pero Neon acepta arrays JS para condiciones `= ANY($n)` en runtime.
 */
export function sqlTextArrayForAny(ids: string[]): any {
  return ids;
}
