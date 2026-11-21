/**
 * 每秒調一次雪片的上限。看的是「每一格的工作佔了多少時間」，不是單看幀率：
 * 省電模式會把畫面鎖在 30 fps，那時手機其實很閒，不能因此把雪砍光。
 *
 * fps：這一秒的平均幀率；workMs：每一格花在計算和畫圖的平均毫秒數。
 */
export function adjustBudget(
  budget: number,
  fps: number,
  workMs: number,
  min = 150,
  max = 1800,
): number {
  const load = workMs / (1000 / Math.max(1, fps)); // 一格的時間裡有多少被用掉
  // 幀率穩定在 60 附近，或穩定在被鎖住的 30 附近，才算「有餘裕」。
  // 不上不下的幀率多半不是程式忙（可能是顯示卡），先不加。
  const steady = fps >= 50 || Math.abs(fps - 30) <= 3;
  let next = budget;
  if (fps < 24 || load > 0.6) next = Math.round(budget * 0.9);
  else if (load < 0.35 && steady) next = Math.round(budget * 1.05);
  return Math.min(max, Math.max(min, next));
}

/** 雪量 0–1 → 現在該有幾片。 */
export function activeCount(amount: number, budget: number): number {
  return Math.round(amount * budget);
}
