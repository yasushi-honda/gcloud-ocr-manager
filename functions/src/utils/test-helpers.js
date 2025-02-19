/**
 * テスト用ヘルパー関数
 */

/**
 * 指定時間待機する
 * @param {number} ms - 待機時間（ミリ秒）
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * モック関数の呼び出し回数を検証する
 * @param {jest.Mock} mockFn - モック関数
 * @param {number} times - 期待される呼び出し回数
 * @param {number} [timeout=1000] - タイムアウト時間（ミリ秒）
 */
const expectEventually = async (mockFn, times, timeout = 1000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (mockFn.mock.calls.length === times) {
      return;
    }
    await wait(100);
  }
  expect(mockFn).toHaveBeenCalledTimes(times);
};

module.exports = {
  wait,
  expectEventually
};
