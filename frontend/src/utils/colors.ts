export function tirColor(value: number | null): string {
  if (value === null) return '#8a8a8a';
  if (value >= 70) return '#5cb888';
  if (value >= 50) return '#c9a84c';
  return '#c75f5f';
}

export function cvColor(value: number | null): string {
  if (value === null) return '#8a8a8a';
  if (value < 36) return '#5cb888';
  return '#d48a4c';
}

/** Color based on glucose in mg/dL (input from backend). */
export function glucoseColor(mgdl: number): string {
  if (mgdl < 54) return '#c75f5f';
  if (mgdl < 70) return '#5b8ec7';
  if (mgdl <= 180) return '#5cb888';
  if (mgdl <= 250) return '#d48a4c';
  return '#c75f5f';
}

/** Color for glucose rise in mg/dL. */
export function riseColor(mgdl: number | null): string {
  if (mgdl === null) return '#8a8a8a';
  if (mgdl < 30) return '#5cb888';
  if (mgdl < 60) return '#c9a84c';
  return '#c75f5f';
}

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: '#2a2a2a',
  border: 'none',
  borderRadius: '10px',
  color: '#e8e8e8',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
  padding: '8px 12px',
  fontSize: '13px',
};
