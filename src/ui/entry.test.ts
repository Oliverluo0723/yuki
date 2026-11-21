import { expect, test } from 'vitest';
import { noticeFor, silentSensorNotice } from './entry';

const ASK = '這件作品要拿在手上看，請允許讀取手機的動作';

test('讀不到手機姿態時的說明', () => {
  expect(noticeFor('granted', false)).toBeNull();
  expect(noticeFor('granted', true)).toBeNull();
  expect(noticeFor('denied', false)).toBe(ASK);
  expect(noticeFor('unsupported', false)).toBe(ASK); // 手機但沒有感測器
  expect(noticeFor('unsupported', true)).toBeNull(); // 電腦：本來就用滑鼠
});

test('允許了卻一直沒有感測器資料（Android 沒有權限詢問，感測器被擋時就是這樣）', () => {
  expect(silentSensorNotice(false, false)).toBe(ASK); // 手機、沒讀到
  expect(silentSensorNotice(true, false)).toBeNull(); // 手機、讀到了
  expect(silentSensorNotice(false, true)).toBeNull(); // 電腦：用滑鼠
});
