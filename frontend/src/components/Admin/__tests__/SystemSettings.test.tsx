import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SystemSettings } from '../SystemSettings';
import { adminReducer } from '../../../store/slices/adminSlice';

const mockStore = configureStore({
  reducer: {
    admin: adminReducer,
  },
  preloadedState: {
    admin: {
      settings: {
        ocrSettings: {
          enabled: true,
          defaultLanguage: 'ja',
          processingTimeout: 300,
        },
        storageSettings: {
          maxFileSize: 10485760, // 10MB
          allowedFileTypes: ['.pdf', '.jpg', '.png'],
        },
        securitySettings: {
          sessionTimeout: 3600,
          maxLoginAttempts: 5,
          allowedDomains: ['example.com'],
        },
      },
      loading: false,
      error: null,
    },
  },
});

describe('SystemSettings', () => {
  beforeEach(() => {
    render(
      <Provider store={mockStore}>
        <SystemSettings />
      </Provider>
    );
  });

  describe('OCR設定', () => {
    it('OCR設定が正しく表示される', () => {
      expect(screen.getByText('OCR設定')).toBeInTheDocument();
      expect(screen.getByLabelText('OCR処理を有効化')).toBeChecked();
      expect(screen.getByLabelText('デフォルト言語')).toHaveValue('ja');
      expect(screen.getByLabelText('処理タイムアウト（秒）')).toHaveValue(300);
    });

    it('OCR設定を変更できる', async () => {
      const languageSelect = screen.getByLabelText('デフォルト言語');
      fireEvent.mouseDown(languageSelect);
      fireEvent.click(screen.getByText('英語'));
      await waitFor(() => {
        expect(screen.getByText('未保存の変更があります')).toBeInTheDocument();
      });
    });
  });

  describe('ストレージ設定', () => {
    it('ストレージ設定が正しく表示される', () => {
      expect(screen.getByText('ストレージ設定')).toBeInTheDocument();
      expect(screen.getByLabelText('最大ファイルサイズ（MB）')).toHaveValue(10);
      expect(screen.getByText('.pdf')).toBeInTheDocument();
      expect(screen.getByText('.jpg')).toBeInTheDocument();
      expect(screen.getByText('.png')).toBeInTheDocument();
    });

    it('ファイルタイプを追加・削除できる', async () => {
      const addButton = screen.getByText('追加');
      fireEvent.click(addButton);
      await waitFor(() => {
        expect(screen.getAllByText('.pdf')).toHaveLength(2);
      });
    });
  });

  describe('セキュリティ設定', () => {
    it('セキュリティ設定が正しく表示される', () => {
      expect(screen.getByText('セキュリティ設定')).toBeInTheDocument();
      expect(screen.getByLabelText('セッションタイムアウト（秒）')).toHaveValue(3600);
      expect(screen.getByLabelText('最大ログイン試行回数')).toHaveValue(5);
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('ドメインを追加・削除できる', async () => {
      const input = screen.getByPlaceholderText('example.com');
      const addButton = screen.getByText('追加');
      
      fireEvent.change(input, { target: { value: 'test.com' } });
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('test.com')).toBeInTheDocument();
      });
    });
  });

  describe('設定の保存', () => {
    it('変更がない場合は保存ボタンが無効', () => {
      const saveButton = screen.getByText('設定を保存');
      expect(saveButton).toBeDisabled();
    });

    it('変更がある場合は保存ボタンが有効になる', async () => {
      const timeoutInput = screen.getByLabelText('セッションタイムアウト（秒）');
      fireEvent.change(timeoutInput, { target: { value: '7200' } });
      
      await waitFor(() => {
        const saveButton = screen.getByText('設定を保存');
        expect(saveButton).toBeEnabled();
      });
    });
  });
});
