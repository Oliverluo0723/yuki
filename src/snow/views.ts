const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * posture（0 直立 … 1 平放）→ 平視與低頭各佔多少。
 * 0.35–0.65 之間連續過渡，不是切換。
 */
export function viewWeights(posture: number): { field: number; glass: number } {
  const glass = smoothstep(0.35, 0.65, posture);
  return { field: 1 - glass, glass };
}
