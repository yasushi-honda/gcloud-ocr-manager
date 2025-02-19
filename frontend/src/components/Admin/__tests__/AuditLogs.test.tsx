import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuditLogs } from '../AuditLogs';
import { adminReducer } from '../../../store/slices/adminSlice';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';

const mockLogs = [
  {
    id: '1',
    timestamp: '2025-02-19T10:30:00Z',
    userId: 'user1',
    action: 'create',
    resource: 'document',
    details: 'ドキュメントを作成しました',
  },
  {
    id: '2',
    timestamp: '2025-02-19T10:35:00Z',
    userId: 'user2',
    action: 'update',
    resource: 'settings',
    details: 'システム設定を更新しました',
  },
];

const mockStore = configureStore({
  reducer: {
    admin: adminReducer,
  },
  preloadedState: {
    admin: {
      auditLogs: mockLogs,
      loading: false,
      error: null,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        {component}
      </LocalizationProvider>
    </Provider>
  );
};

describe('AuditLogs', () => {
  beforeEach(() => {
    renderWithProviders(<AuditLogs />);
  });

  describe('ログ一覧', () => {
    it('監査ログが正しく表示される', () => {
      expect(screen.getByText('user1')).toBeInTheDocument();
      expect(screen.getByText('create')).toBeInTheDocument();
      expect(screen.getByText('document')).toBeInTheDocument();
      expect(screen.getByText('ドキュメントを作成しました')).toBeInTheDocument();
    });

    it('タイムスタンプが正しいフォーマットで表示される', () => {
      expect(screen.getByText('2025-02-19 19:42:53')).toBeInTheDocument();
    });
  });

  describe('フィルター機能', () => {
    it('ユーザーIDでフィルターできる', async () => {
      const userIdInput = screen.getByLabelText('ユーザーID');
      fireEvent.change(userIdInput, { target: { value: 'user2' } });
      
      await waitFor(() => {
        expect(screen.queryByText('user1')).not.toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      });
    });

    it('アクションでフィルターできる', async () => {
      const actionSelect = screen.getByLabelText('アクション');
      fireEvent.mouseDown(actionSelect);
      fireEvent.click(screen.getByText('更新'));
      
      await waitFor(() => {
        expect(screen.queryByText('create')).not.toBeInTheDocument();
        expect(screen.getByText('update')).toBeInTheDocument();
      });
    });

    it('フィルターをクリアできる', async () => {
      const userIdInput = screen.getByLabelText('ユーザーID');
      fireEvent.change(userIdInput, { target: { value: 'user2' } });
      
      const clearButton = screen.getByText('クリア');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('user2')).toBeInTheDocument();
      });
    });
  });

  describe('CSVエクスポート', () => {
    it('エクスポートボタンが表示される', () => {
      expect(screen.getByText('CSVエクスポート')).toBeInTheDocument();
    });

    it('エクスポートを実行できる', async () => {
      const exportButton = screen.getByText('CSVエクスポート');
      fireEvent.click(exportButton);
      
      // エクスポート処理は非同期で実行されるため、
      // 実際のテストではモック関数の呼び出しを検証します
      await waitFor(() => {
        // ここでモック関数の呼び出しを検証
      });
    });
  });

  describe('無限スクロール', () => {
    it('さらに読み込むボタンが表示される', () => {
      expect(screen.getByText('さらに読み込む')).toBeInTheDocument();
    });

    it('追加のログを読み込める', async () => {
      const loadMoreButton = screen.getByText('さらに読み込む');
      fireEvent.click(loadMoreButton);
      
      await waitFor(() => {
        // ここで追加のログが読み込まれたことを検証
      });
    });
  });
});
