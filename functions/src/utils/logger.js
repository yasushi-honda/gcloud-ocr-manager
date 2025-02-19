/**
 * 構造化ログ出力
 */
class Logger {
  constructor(context = {}) {
    this.context = context;
  }

  /**
   * ログメッセージの作成
   * @param {string} severity - ログレベル
   * @param {string} message - メッセージ
   * @param {Object} data - 追加データ
   * @returns {Object} - 構造化ログ
   */
  formatLog(severity, message, data = {}) {
    return {
      severity,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data
    };
  }

  info(message, data = {}) {
    console.log(JSON.stringify(this.formatLog('INFO', message, data)));
  }

  error(message, error, data = {}) {
    console.error(JSON.stringify(this.formatLog('ERROR', message, {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      ...data
    })));
  }

  warn(message, data = {}) {
    console.warn(JSON.stringify(this.formatLog('WARNING', message, data)));
  }
}

module.exports = Logger;
