import type { Direction } from "./types";
import { round } from "./round";

export interface PositionSizeInput {
  capital: number;
  riskPct: number;
  entry: number;
  stop: number;
  takeProfit?: number | null;
  leverage?: number | null;
  /** Comissió per costat en % del valor de la posició (ex.: 0.05). */
  feePct?: number | null;
}

export interface PositionSizeResult {
  direction: Direction;
  riskAmount: number;
  riskPerUnit: number;
  stopDistancePct: number;
  quantity: number;
  positionValue: number;
  margin: number;
  effectiveLeverage: number;
  maxLoss: number;
  estimatedFees: number;
  rr: number | null;
  targets: { r1: number; r2: number; r3: number };
  /** Palanquejament mínim necessari perquè el marge càpiga al capital. */
  requiredLeverage: number;
}

export class PositionSizeError extends Error {}

/**
 * Mida de posició per risc fix:
 *   quantitat = (capital · risc%) / |entrada − SL|
 * La direcció es dedueix del costat del SL respecte a l'entrada.
 */
export function calcPositionSize(input: PositionSizeInput): PositionSizeResult {
  const { capital, riskPct, entry, stop } = input;
  const leverage = input.leverage && input.leverage > 0 ? input.leverage : 1;
  const feePct = input.feePct ?? 0;

  if (!(capital > 0)) throw new PositionSizeError("El capital ha de ser positiu.");
  if (!(riskPct > 0 && riskPct <= 100)) throw new PositionSizeError("El risc ha d'estar entre 0 i 100 %.");
  if (!(entry > 0) || !(stop > 0)) throw new PositionSizeError("Els preus han de ser positius.");
  if (entry === stop) throw new PositionSizeError("L'stop loss no pot ser igual al preu d'entrada.");

  const direction: Direction = stop < entry ? "long" : "short";
  const sign = direction === "long" ? 1 : -1;
  const riskAmount = (capital * riskPct) / 100;
  const riskPerUnit = Math.abs(entry - stop);
  const quantity = riskAmount / riskPerUnit;
  const positionValue = quantity * entry;
  const margin = positionValue / leverage;

  let rr: number | null = null;
  if (input.takeProfit != null && input.takeProfit > 0) {
    const reward = sign * (input.takeProfit - entry);
    if (reward <= 0) throw new PositionSizeError("El take profit ha d'estar a favor de la direcció de l'operació.");
    rr = reward / riskPerUnit;
  }

  const target = (r: number) => entry + sign * riskPerUnit * r;
  const estimatedFees = positionValue * (feePct / 100) * 2;

  return {
    direction,
    riskAmount: round(riskAmount, 2),
    riskPerUnit,
    stopDistancePct: round((riskPerUnit / entry) * 100, 3),
    quantity: round(quantity, 8),
    positionValue: round(positionValue, 2),
    margin: round(margin, 2),
    effectiveLeverage: round(positionValue / capital, 2),
    maxLoss: round(riskAmount + estimatedFees, 2),
    estimatedFees: round(estimatedFees, 2),
    rr: rr === null ? null : round(rr, 2),
    targets: { r1: target(1), r2: target(2), r3: target(3) },
    requiredLeverage: round(Math.max(1, positionValue / capital), 2),
  };
}
