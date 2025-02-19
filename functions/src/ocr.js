const {Storage} = require('@google-cloud/storage');
const {DocumentProcessorServiceClient} = require('@google-cloud/documentai');
const {Firestore} = require('@google-cloud/firestore');
const Logger = require('./utils/logger');
const {withRetry} = require('./utils/retry');

let firestoreInstance;
let storageInstance;
let documentAiClient;
const logger = new Logger({ service: 'ocr' });

// 依存関係の注入用関数
const setFirestore = (instance) => {
  firestoreInstance = instance;
};

const setStorage = (instance) => {
  storageInstance = instance;
};

// Firestoreインスタンスの取得
const getFirestore = () => {
  if (!firestoreInstance) {
    firestoreInstance = new Firestore();
  }
  return firestoreInstance;
};

// Storageインスタンスの取得
const getStorage = () => {
  if (!storageInstance) {
    storageInstance = new Storage();
  }
  return storageInstance;
};

// Document AIクライアントの取得
const getDocumentAiClient = () => {
  if (!documentAiClient) {
    documentAiClient = new DocumentProcessorServiceClient();
  }
  return documentAiClient;
};

/**
 * OCR処理を実行する関数
 * @param {string} bucketName - バケット名
 * @param {string} fileName - ファイル名
 * @returns {Promise<Object>} - 処理結果
 */
async function processDocument(bucketName, fileName) {
  logger.info('Starting OCR processing', { bucketName, fileName });

  // Firestoreのドキュメント参照を作成
  const firestore = getFirestore();
  const docRef = firestore.collection('documents').doc();

  try {
    // バケットとファイルの存在確認
    const storage = getStorage();
    const bucket = storage.bucket(bucketName);
    const [bucketExists] = await withRetry(() => bucket.exists());

    if (!bucketExists) {
      const error = new Error(`Bucket ${bucketName} not found`);
      error.code = 'BUCKET_NOT_FOUND';
      throw error;
    }

    const file = bucket.file(fileName);
    const [fileExists] = await withRetry(() => file.exists());

    if (!fileExists) {
      const error = new Error(`File ${fileName} not found in bucket ${bucketName}`);
      error.code = 'FILE_NOT_FOUND';
      throw error;
    }

    // ファイルの内容を取得
    const [fileContent] = await withRetry(() => file.download());

    // Document AI処理のリクエストを作成
    const request = {
      name: `projects/${process.env.PROJECT_ID}/locations/${process.env.LOCATION}/processors/${process.env.PROCESSOR_ID}`,
      rawDocument: {
        content: fileContent.toString('base64'),
        mimeType: 'application/pdf'
      }
    };

    // Document AI処理の実行
    const documentAiClient = getDocumentAiClient();
    const processDocumentWithValidation = async () => {
      const result = await documentAiClient.processDocument(request);
      console.log('Document AI処理結果:', JSON.stringify(result, null, 2));
      
      if (!result || !Array.isArray(result) || result.length === 0) {
        const error = new Error('Document AI returned no results');
        error.code = 'DOCUMENT_AI_NO_RESULTS';
        throw error;
      }

      if (!result[0] || !result[0].document || !result[0].document.text) {
        const error = new Error('Document AI returned invalid results');
        error.code = 'DOCUMENT_AI_INVALID_RESULTS';
        throw error;
      }

      return result;
    };

    let result;
    try {
      result = await withRetry(processDocumentWithValidation);
    } catch (error) {
      // エラー情報をFirestoreに保存
      await docRef.set({
        documentId: docRef.id,
        status: 'error',
        errorCode: error.code || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        processedAt: new Date(),
        fileName,
        bucketName
      });
      throw error;
    }

    // 信頼度スコアの計算
    let confidence = 1.0;
    if (result[0].document.textStyles && Array.isArray(result[0].document.textStyles)) {
      const validStyles = result[0].document.textStyles.filter(style => typeof style.confidence === 'number');
      if (validStyles.length > 0) {
        const totalConfidence = validStyles.reduce((sum, style) => sum + style.confidence, 0);
        confidence = totalConfidence / validStyles.length;
      }
    }

    // 処理結果の作成
    const processedData = {
      documentId: docRef.id,
      text: result[0].document.text || '',
      confidence,
      processedAt: new Date(),
      status: 'completed',
      fileName,
      bucketName
    };

    // 結果をFirestoreに保存
    await withRetry(() => docRef.set(processedData));

    logger.info('OCR processing completed successfully', {
      documentId: docRef.id,
      confidence,
      fileName,
      bucketName
    });

    return processedData;
  } catch (error) {
    logger.error('Error processing document', error, {
      documentId: docRef.id,
      fileName,
      bucketName
    });
    
    // エラー情報をFirestoreに保存
    await withRetry(() => docRef.set({
      documentId: docRef.id,
      error: error.message,
      errorCode: error.code,
      status: 'error',
      processedAt: new Date(),
      fileName,
      bucketName
    }));

    throw error;
  }
}

module.exports = {
  processDocument,
  setFirestore,
  setStorage
};
