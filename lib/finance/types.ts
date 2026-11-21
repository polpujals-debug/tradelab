export type Direction = "long" | "short";

/** Operació tancada amb les dades mínimes per calcular estadístiques. */
export interface ClosedTradeLike {
  id: string;
  netPnl: number;
  rMultiple: number | null;
  exitAt: string; // ISO
  fees?: number;
}
