/** Arrodoneix evitant errors de coma flotant (0.1 + 0.2). */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

export function sum(values: readonly number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
