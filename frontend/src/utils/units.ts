/** Convert mg/dL to mmol/L, rounded to 1 decimal. */
export function toMmol(mgdl: number | null | undefined): number | null {
  if (mgdl === null || mgdl === undefined) return null;
  return Math.round((mgdl / 18.0182) * 10) / 10;
}

/** Format mmol/L value for display. */
export function fmtMmol(mgdl: number | null | undefined): string {
  const v = toMmol(mgdl);
  return v !== null ? v.toFixed(1) : '\u2014';
}

/** Target ranges in mmol/L */
export const RANGE = {
  low: 3.9,       // 70 mg/dL
  high: 10.0,     // 180 mg/dL
  veryHigh: 13.9, // 250 mg/dL
  veryLow: 3.0,   // 54 mg/dL
};
