const {Storage} = require('@google-cloud/storage');
const {processDocument} = require('./ocr');

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.processFile = async (req, res) => {
  try {
    const { bucket, name } = req.body;

    if (!bucket || !name) {
      return res.status(400).json({
        error: 'Invalid request',
        details: 'bucket and name are required'
      });
    }

    // バケットとファイルの存在確認
    const storage = new Storage();
    const bucketObj = storage.bucket(bucket);
    const [bucketExists] = await bucketObj.exists();
    
    if (!bucketExists) {
      return res.status(404).json({
        error: 'Bucket not found',
        details: `Bucket ${bucket} not found`
      });
    }

    const file = bucketObj.file(name);
    const [fileExists] = await file.exists();
    
    if (!fileExists) {
      return res.status(404).json({
        error: 'File not found',
        details: `File ${name} not found in bucket ${bucket}`
      });
    }

    // OCR処理の開始
    const result = await processDocument(bucket, name);
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error processing document:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message || 'Processing failed'
    });
  }
};

// HTTP関数としてエクスポート
const functions = require('@google-cloud/functions-framework');
functions.http('processFile', exports.processFile);

module.exports = {
  processFile: exports.processFile
};
