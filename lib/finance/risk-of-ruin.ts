import { round } from "./round";

export interface RiskOfRuinInput {
  /** Taxa d'encert en % (0–100). */
  winRate: number;
  /** Guany mitjà de les guanyadores en R (les perdedores valen −1R). */
  rewardRisk: number;
  /** Pèrdua acumulada (en R, des del capital inicial) que considerem ruïna. */
  ruinR: number;
  /** Nombre d'operacions simulades per camí. */
  horizon?: number;
  paths?: number;
  seed?: number;
}

export interface RiskOfRuinResult {
  probability: number; // %
  expectancyR: number; // R per operació
  verdict: "bulletproof" | "low" | "moderate" | "high" | "critical";
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Probabilitat (Monte Carlo, determinista) de perdre `ruinR` R abans de
 * completar `horizon` operacions, amb risc fix per operació.
 */
export function riskOfRuin(i: RiskOfRuinInput): RiskOfRuinResult {
  const p = Math.min(Math.max(i.winRate, 0), 100) / 100;
  const b = Math.max(i.rewardRisk, 0);
  const ruin = Math.max(i.ruinR, 1);
  const horizon = i.horizon ?? 500;
  const paths = i.paths ?? 4000;
  const rand = rng(i.seed ?? 42);
  let ruined = 0;
  for (let k = 0; k < paths; k++) {
    let equity = 0;
    for (let n = 0; n < horizon; n++) {
      equity += rand() < p ? b : -1;
      if (equity <= -ruin) {
        ruined++;
        break;
      }
    }
  }
  const probability = round((ruined / paths) * 100, 2);
  const verdict = probability < 1 ? "bulletproof" : probability < 5 ? "low" : probability < 20 ? "moderate" : probability < 50 ? "high" : "critical";
  return { probability, expectancyR: round(p * b - (1 - p), 3), verdict };
}
