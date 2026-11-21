/**
 * 右下角那一行小字：顯示現在的模式，點它切換。
 * 這是畫面上唯一的常駐介面。
 */
export function mountLabel(onToggle: () => void): { set(text: string): void } {
  const el = document.createElement('button');
  el.id = 'label';
  el.type = 'button';
  // 點標籤不算碰玻璃，不能同時把雪融掉
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('click', onToggle);
  document.body.appendChild(el);
  let shown = '';
  return {
    set(text: string) {
      if (text === shown) return;
      shown = text;
      el.textContent = text;
    },
  };
}
