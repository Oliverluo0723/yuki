import { type OrientationPermission, requestOrientation } from '../input/orientation';
import { keepAwake } from '../input/wakeLock';

const ASK = '這件作品要拿在手上看，請允許讀取手機的動作';

/** 讀不到手機姿態時要不要說明。電腦本來就用滑鼠，不用說。 */
export function noticeFor(result: OrientationPermission, desktop: boolean): string | null {
  if (result === 'denied') return ASK;
  if (result === 'unsupported' && !desktop) return ASK;
  return null;
}

/**
 * 允許了卻一直沒有感測器資料：Android 沒有權限詢問，感測器被網站設定擋掉、
 * 或裝置根本沒有感測器時就是這樣。手機上要說明，電腦用滑鼠所以不用。
 */
export function silentSensorNotice(hasReading: boolean, desktop: boolean): string | null {
  return hasReading || desktop ? null : ASK;
}

/**
 * 入口。iPhone 規定讀手機姿態前必須由使用者點一下，所以一定有這一頁。
 * 點下去的同一個事件裡請求姿態權限與螢幕常亮，然後淡出。
 */
export function showEntry(opts: {
  desktop: boolean;
  url: string;
  /** 在點擊的同一個事件裡呼叫：聲音要在這裡開始，瀏覽器才放行 */
  onStart?: () => void;
}): Promise<OrientationPermission> {
  const el = document.createElement('div');
  el.id = 'entry';

  const add = (tag: string, cls: string, text: string) => {
    const node = document.createElement(tag);
    node.className = cls;
    node.textContent = text;
    el.appendChild(node);
    return node;
  };
  add('h1', 'entry-title', 'Yuki');
  add('p', 'entry-line', '手機怎麼拿，就是你怎麼看雪。');
  add('p', 'entry-start', '點一下開始');
  if (opts.desktop) {
    add('p', 'entry-small', `這件作品原本是拿在手上看的：${opts.url}`);
    add('p', 'entry-small', '移動滑鼠，往下捲');
  }
  const credit = add('a', 'entry-credit', '天氣資料：Open-Meteo.com') as HTMLAnchorElement;
  credit.href = 'https://open-meteo.com/';
  credit.target = '_blank';
  credit.rel = 'noopener';

  document.body.appendChild(el);

  return new Promise((resolve) => {
    const start = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest('a')) return; // 點連結不算開始
      el.removeEventListener('click', start);
      // 必須在點擊的處理函式裡直接呼叫，前面不能有 await，否則 iPhone 會拒絕
      const asked = requestOrientation();
      keepAwake();
      opts.onStart?.();
      el.classList.add('leaving');
      setTimeout(() => el.remove(), 800);
      asked.then(resolve);
    };
    el.addEventListener('click', start);
  });
}

/** 畫面底部置中的一行小字，6 秒後淡出。 */
export function showNotice(text: string): void {
  const el = document.createElement('div');
  el.id = 'notice';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('leaving'), 6000);
  setTimeout(() => el.remove(), 7000);
}
