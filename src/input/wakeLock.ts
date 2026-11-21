/** 這件作品大部分時間不用碰螢幕；不保持亮著，手機 30 秒就會變暗。 */
export function keepAwake(): void {
  if (!('wakeLock' in navigator)) return;
  const request = () => {
    navigator.wakeLock.request('screen').catch(() => {
      // 省電模式或瀏覽器拒絕：沒有辦法，照常執行
    });
  };
  request();
  // 切到背景時鎖會被系統收回，回來要重新請求
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') request();
  });
}
