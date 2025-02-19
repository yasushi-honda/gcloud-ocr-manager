const {handlePubSubMessage} = require('../src/pubsub');
const {processDocument} = require('../src/ocr');

// OCR処理をモック
jest.mock('../src/ocr');

describe('Pub/Sub Message Handler Tests', () => {
  let mockContext;
  let mockData;

  beforeEach(() => {
    // OCR処理のモックをリセット
    processDocument.mockReset();
    processDocument.mockResolvedValue({
      documentId: 'test-doc-id',
      text: 'processed text',
      confidence: 0.95
    });

    // メッセージデータとコンテキストを設定
    mockData = {
      bucket: 'test-bucket',
      name: 'test.pdf'
    };
    mockContext = {
      eventId: 'test-event-id',
      timestamp: '2023-01-01T00:00:00Z',
      eventType: 'google.pubsub.topic.publish'
    };
  });

  test('successfully processes a message', async () => {
    const pubsubMessage = {
      data: Buffer.from(JSON.stringify(mockData)).toString('base64'),
      attributes: {}
    };

    await handlePubSubMessage(pubsubMessage, mockContext);

    expect(processDocument).toHaveBeenCalledWith(
      mockData.bucket,
      mockData.name
    );
  });

  test('handles invalid message data', async () => {
    const pubsubMessage = {
      data: Buffer.from('invalid json').toString('base64'),
      attributes: {}
    };

    await expect(handlePubSubMessage(pubsubMessage, mockContext))
      .rejects
      .toThrow('Invalid message data');
  });

  test('handles missing required fields', async () => {
    const pubsubMessage = {
      data: Buffer.from(JSON.stringify({ bucket: 'test-bucket' })).toString('base64'),
      attributes: {}
    };

    await expect(handlePubSubMessage(pubsubMessage, mockContext))
      .rejects
      .toThrow('Missing required fields');
  });

  test('handles processing error', async () => {
    processDocument.mockRejectedValue(new Error('Processing failed'));

    const pubsubMessage = {
      data: Buffer.from(JSON.stringify(mockData)).toString('base64'),
      attributes: {}
    };

    await expect(handlePubSubMessage(pubsubMessage, mockContext))
      .rejects
      .toThrow('Processing failed');
  });
});
