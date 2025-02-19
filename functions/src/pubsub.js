const functions = require('@google-cloud/functions-framework');
const {processDocument} = require('./ocr');

/**
 * Pub/Subメッセージを処理する
 * @param {Object} message Pub/Subメッセージ
 * @param {Object} context イベントコンテキスト
 */
async function handlePubSubMessage(message, context) {
  try {
    // メッセージデータをデコード
    const data = JSON.parse(Buffer.from(message.data, 'base64').toString());

    // 必須フィールドの検証
    if (!data.bucket || !data.name) {
      throw new Error('Missing required fields');
    }

    // OCR処理を実行
    await processDocument(data.bucket, data.name);

  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid message data');
    }
    throw error;
  }
}

module.exports = {
  handlePubSubMessage
};
