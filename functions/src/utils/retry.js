/**
 * リトライ処理を行う関数
 * @param {Function} fn - 実行する関数
 * @param {Object} options - リトライオプション
 * @param {number} options.maxAttempts - 最大リトライ回数
 * @param {number} options.initialDelay - 初期遅延時間（ミリ秒）
 * @param {number} options.maxDelay - 最大遅延時間（ミリ秒）
 * @returns {Promise<*>} - 実行結果
 */
async function withRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const initialDelay = options.initialDelay || 1000;
  const maxDelay = options.maxDelay || 5000;

  let attempt = 1;
  let delay = initialDelay;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      delay = Math.min(delay * 2, maxDelay);
      attempt++;
    }
  }
}

module.exports = {
  withRetry
};
