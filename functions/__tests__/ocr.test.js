const {DocumentProcessorServiceClient} = require('@google-cloud/documentai');
const {Storage} = require('@google-cloud/storage');
const {Firestore} = require('@google-cloud/firestore');
const {processDocument, setFirestore, setStorage} = require('../src/ocr');
const {wait, expectEventually} = require('../src/utils/test-helpers');

// モックのセットアップ
jest.mock('@google-cloud/documentai');
jest.mock('@google-cloud/storage');
jest.mock('@google-cloud/firestore');
jest.mock('../src/utils/logger');

// グローバルなモックの設定
let mockDocumentAi;
let mockDocRef;
let mockCollection;
let mockFirestore;
let mockFile;
let mockBucket;
let mockStorage;

beforeAll(() => {
  // グローバルなモックの初期化
  mockDocRef = {
    set: jest.fn().mockResolvedValue({}),
    id: 'test-doc-id'
  };
  mockCollection = {
    doc: jest.fn().mockReturnValue(mockDocRef)
  };
  mockFirestore = {
    collection: jest.fn().mockReturnValue(mockCollection)
  };
  mockDocumentAi = {
    processDocument: jest.fn()
  };
  mockFile = {
    exists: jest.fn(),
    download: jest.fn()
  };
  mockBucket = {
    file: jest.fn().mockReturnValue(mockFile),
    exists: jest.fn()
  };
  mockStorage = {
    bucket: jest.fn().mockReturnValue(mockBucket)
  };

  // モックの設定
  Firestore.mockImplementation(() => mockFirestore);
  DocumentProcessorServiceClient.mockImplementation(() => mockDocumentAi);
  Storage.mockImplementation(() => mockStorage);

  // グローバルな依存関係の設定
  setFirestore(mockFirestore);
  setStorage(mockStorage);
});

beforeEach(() => {
  // 各テストの前にモックをリセット
  jest.clearAllMocks();
  
  // デフォルトの成功レスポンスを設定
  mockFile.exists.mockResolvedValue([true]);
  mockFile.download.mockResolvedValue([Buffer.from('test content')]);
  mockBucket.exists.mockResolvedValue([true]);
  mockDocumentAi.processDocument.mockResolvedValue([{
    document: {
      text: 'processed text',
      textStyles: [
        { confidence: 0.9 },
        { confidence: 0.95 }
      ]
    }
  }]);
});

describe('OCR Processing Tests', () => {
  describe('正常系テスト', () => {
    test('ドキュメントを正常に処理できること', async () => {
      console.log('テスト: ドキュメントを正常に処理できること');
      const result = await processDocument('test-bucket', 'test.pdf');
      console.log('処理結果:', JSON.stringify(result, null, 2));

      expect(result).toEqual({
        documentId: 'test-doc-id',
        text: 'processed text',
        confidence: 0.925,
        processedAt: expect.any(Date),
        status: 'completed',
        fileName: 'test.pdf',
        bucketName: 'test-bucket'
      });

      expect(mockStorage.bucket).toHaveBeenCalledWith('test-bucket');
      expect(mockBucket.file).toHaveBeenCalledWith('test.pdf');
      expect(mockFile.exists).toHaveBeenCalled();
      expect(mockFile.download).toHaveBeenCalled();
      expect(mockDocumentAi.processDocument).toHaveBeenCalled();
      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
        text: 'processed text',
        confidence: 0.925,
        status: 'completed'
      }));
    });

    test('リトライ機能が正常に動作すること', async () => {
      console.log('テスト: リトライ機能が正常に動作すること');
      mockFile.exists
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([true]);

      const result = await processDocument('test-bucket', 'test.pdf');
      console.log('処理結果:', JSON.stringify(result, null, 2));

      expect(result).toBeDefined();
      expect(mockFile.exists).toHaveBeenCalledTimes(3);
    });
  });

  describe('エラー処理テスト', () => {
    beforeEach(async () => {
      console.log('=== エラー処理テストの初期化開始 ===');
      
      // エラー処理テストの前にモックをリセット
      jest.clearAllMocks();
      console.log('モックをクリアしました');
      
      // Firestoreのモックを再設定
      mockDocRef.set.mockResolvedValue({});
      mockCollection.doc.mockReturnValue(mockDocRef);
      mockFirestore.collection.mockReturnValue(mockCollection);
      setFirestore(mockFirestore);
      console.log('Firestoreモックを再設定しました');
      
      // Document AIのモックを再設定
      mockDocumentAi.processDocument.mockImplementation(async () => {
        console.log('Document AI処理が呼び出されました');
        console.log('空の配列を返します []');
        return [];
      });
      console.log('Document AIモックを再設定しました');
      
      // Storageのモックを再設定
      mockFile.exists.mockResolvedValue([true]);
      mockFile.download.mockResolvedValue([Buffer.from('test content')]);
      mockBucket.exists.mockResolvedValue([true]);
      mockBucket.file.mockReturnValue(mockFile);
      mockStorage.bucket.mockReturnValue(mockBucket);
      setStorage(mockStorage);
      console.log('Storageモックを再設定しました');
      
      console.log('=== エラー処理テストの初期化完了 ===');
    });

    test('存在しないバケットの場合、適切なエラーを返すこと', async () => {
      console.log('テスト: 存在しないバケットの場合のエラー処理');
      mockBucket.exists.mockResolvedValue([false]);

      await expect(processDocument('invalid-bucket', 'test.pdf'))
        .rejects
        .toThrow('Bucket invalid-bucket not found');

      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        errorCode: 'BUCKET_NOT_FOUND'
      }));
    });

    test('存在しないファイルの場合、適切なエラーを返すこと', async () => {
      console.log('テスト: 存在しないファイルの場合のエラー処理');
      mockFile.exists.mockResolvedValue([false]);

      await expect(processDocument('test-bucket', 'non-existent.pdf'))
        .rejects
        .toThrow('File non-existent.pdf not found in bucket test-bucket');

      expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        errorCode: 'FILE_NOT_FOUND'
      }));
    });

    test('Document AI処理失敗時、適切なエラーを返すこと', async () => {
      console.log('=== Document AI処理失敗テスト開始 ===');
      
      // Document AI処理が失敗するように設定
      mockDocumentAi.processDocument.mockImplementation(async () => {
        console.log('Document AI処理が呼び出されました');
        console.log('空の配列を返します []');
        return [];
      });
      
      console.log('モックの設定を確認します');
      const mockResult = await mockDocumentAi.processDocument();
      console.log('モックの戻り値:', JSON.stringify(mockResult, null, 2));
      console.log('モックの呼び出し回数:', mockDocumentAi.processDocument.mock.calls.length);

      console.log('processDocumentを実行します...');
      try {
        await processDocument('test-bucket', 'test.pdf');
        console.error('エラーが発生しませんでした！これは想定外です。');
      } catch (error) {
        console.log('期待通りエラーが発生しました:', error.message);
        expect(error.message).toBe('Document AI returned no results');
        expect(error.code).toBe('DOCUMENT_AI_NO_RESULTS');
        expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
          status: 'error',
          errorCode: 'DOCUMENT_AI_NO_RESULTS'
        }));
        console.log('テストは成功しました');
        return;
      }

      // ここまで到達した場合はテスト失敗
      throw new Error('エラーが発生しませんでした');
    });

    test('最大リトライ回数を超えた場合、エラーを返すこと', async () => {
      console.log('テスト: 最大リトライ回数超過時のエラー処理');
      const networkError = new Error('Network error');
      mockFile.exists.mockRejectedValue(networkError);

      await expect(processDocument('test-bucket', 'test.pdf'))
        .rejects
        .toThrow('Network error');

      expect(mockFile.exists).toHaveBeenCalledTimes(3);
    });
  });
});
