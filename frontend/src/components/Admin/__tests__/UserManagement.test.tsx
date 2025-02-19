import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { UserManagement } from '../UserManagement';
import { adminReducer } from '../../../store/slices/adminSlice';

const mockUsers = [
  {
    id: '1',
    name: 'テストユーザー1',
    email: 'test1@example.com',
    role: 'admin',
    status: 'active',
  },
  {
    id: '2',
    name: 'テストユーザー2',
    email: 'test2@example.com',
    role: 'user',
    status: 'inactive',
  },
];

const mockStore = configureStore({
  reducer: {
    admin: adminReducer,
  },
  preloadedState: {
    admin: {
      users: mockUsers,
      loading: false,
      error: null,
    },
  },
});

describe('UserManagement', () => {
  beforeEach(() => {
    render(
      <Provider store={mockStore}>
        <UserManagement />
      </Provider>
    );
  });

  describe('ユーザー一覧', () => {
    it('ユーザー一覧が正しく表示される', () => {
      expect(screen.getByText('テストユーザー1')).toBeInTheDocument();
      expect(screen.getByText('test1@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('検索機能が動作する', async () => {
      const searchInput = screen.getByPlaceholderText('検索...');
      fireEvent.change(searchInput, { target: { value: 'テストユーザー2' } });
      
      await waitFor(() => {
        expect(screen.getByText('テストユーザー2')).toBeInTheDocument();
        expect(screen.queryByText('テストユーザー1')).not.toBeInTheDocument();
      });
    });
  });

  describe('ユーザー追加', () => {
    it('追加ダイアログが表示される', () => {
      const addButton = screen.getByText('ユーザー追加');
      fireEvent.click(addButton);
      
      expect(screen.getByText('ユーザー追加')).toBeInTheDocument();
      expect(screen.getByLabelText('名前')).toBeInTheDocument();
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    });

    it('必須フィールドが入力されるまで保存ボタンが無効', () => {
      const addButton = screen.getByText('ユーザー追加');
      fireEvent.click(addButton);
      
      const saveButton = screen.getByText('保存');
      expect(saveButton).toBeDisabled();
      
      const nameInput = screen.getByLabelText('名前');
      const emailInput = screen.getByLabelText('メールアドレス');
      
      fireEvent.change(nameInput, { target: { value: '新規ユーザー' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      
      expect(saveButton).toBeEnabled();
    });
  });

  describe('ユーザー編集', () => {
    it('編集ダイアログが表示される', () => {
      const editButtons = screen.getAllByTitle('編集');
      fireEvent.click(editButtons[0]);
      
      expect(screen.getByText('ユーザー編集')).toBeInTheDocument();
      expect(screen.getByDisplayValue('テストユーザー1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test1@example.com')).toBeInTheDocument();
    });

    it('ユーザー情報を更新できる', async () => {
      const editButtons = screen.getAllByTitle('編集');
      fireEvent.click(editButtons[0]);
      
      const nameInput = screen.getByLabelText('名前');
      fireEvent.change(nameInput, { target: { value: '更新されたユーザー' } });
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByText('ユーザー編集')).not.toBeInTheDocument();
      });
    });
  });

  describe('ユーザー削除', () => {
    it('削除確認ダイアログが表示される', () => {
      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);
      
      expect(screen.getByText('ユーザー削除の確認')).toBeInTheDocument();
      expect(screen.getByText(/テストユーザー1/)).toBeInTheDocument();
    });

    it('削除をキャンセルできる', () => {
      const deleteButtons = screen.getAllByTitle('削除');
      fireEvent.click(deleteButtons[0]);
      
      const cancelButton = screen.getByText('キャンセル');
      fireEvent.click(cancelButton);
      
      expect(screen.queryByText('ユーザー削除の確認')).not.toBeInTheDocument();
    });
  });
});
