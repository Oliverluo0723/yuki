/** 每秒依平均幀率調一次雪片的上限：跑不動就少一點，有餘裕就多一點。 */
export function adjustBudget(budget: number, fps: number, min = 150, max = 1800): number {
  let next = budget;
  if (fps < 50) next = Math.round(budget * 0.9);
  else if (fps > 58) next = Math.round(budget * 1.05);
  return Math.min(max, Math.max(min, next));
}

/** 雪量 0–1 → 現在該有幾片。 */
export function activeCount(amount: number, budget: number): number {
  return Math.round(amount * budget);
}
