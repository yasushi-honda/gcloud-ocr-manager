const {processFile} = require('../src/index');
const {Storage} = require('@google-cloud/storage');
const {processDocument} = require('../src/ocr');
const functionsFramework = require('@google-cloud/functions-framework');

jest.mock('@google-cloud/storage');
jest.mock('../src/ocr');
jest.mock('@google-cloud/functions-framework');

describe('HTTP Endpoint Tests', () => {
  let mockBucket;
  let mockFile;
  let mockStorage;
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    // ストレージのモックをセットアップ
    mockFile = {
      exists: jest.fn().mockResolvedValue([true]),
      download: jest.fn().mockResolvedValue([Buffer.from('test content')])
    };
    mockBucket = {
      file: jest.fn().mockReturnValue(mockFile),
      exists: jest.fn().mockResolvedValue([true])
    };
    mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket)
    };
    Storage.mockImplementation(() => mockStorage);

    // OCR処理のモックをセットアップ
    processDocument.mockResolvedValue({
      documentId: 'test-doc-id',
      text: 'processed text',
      confidence: 0.95,
      status: 'completed'
    });

    // リクエストとレスポンスのモックをセットアップ
    req = {
      body: {
        bucket: 'test-bucket',
        name: 'test.pdf'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  test('processes document successfully', async () => {
    await processFile(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      documentId: 'test-doc-id',
      text: 'processed text',
      confidence: 0.95,
      status: 'completed'
    });
  });

  test('handles missing file', async () => {
    mockFile.exists.mockResolvedValueOnce([false]);

    await processFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'File not found',
      details: `File test.pdf not found in bucket test-bucket`
    });
  });

  test('handles missing bucket', async () => {
    mockBucket.exists.mockResolvedValueOnce([false]);

    await processFile(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Bucket not found',
      details: `Bucket test-bucket not found`
    });
  });

  test('handles invalid request', async () => {
    req.body = {};

    await processFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid request',
      details: 'bucket and name are required'
    });
  });

  test('handles processing error', async () => {
    processDocument.mockRejectedValueOnce(new Error('Processing failed'));

    await processFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error',
      details: 'Processing failed'
    });
  });
});
