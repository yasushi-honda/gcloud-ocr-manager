import { memo, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  updateUser,
  deleteUser,
  createUser,
} from '../../store/slices/adminSlice';
import { User } from '../../types/admin';
import {
  useDebounceState,
  useFetchData,
  useSortedData,
  useFilteredData,
} from '../../hooks/useOptimization';

// メモ化されたユーザー行コンポーネント
const UserRow = memo(({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}) => {
  const getStatusChip = (status: string) => {
    let color: 'default' | 'primary' | 'error' = 'default';
    switch (status) {
      case 'active':
        color = 'primary';
        break;
      case 'inactive':
        color = 'error';
        break;
    }
    return <Chip label={status} color={color} size="small" />;
  };

  return (
    <TableRow>
      <TableCell>{user.id}</TableCell>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{user.role}</TableCell>
      <TableCell>{getStatusChip(user.status)}</TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="編集">
            <IconButton size="small" onClick={() => onEdit(user)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="削除">
            <IconButton
              size="small"
              onClick={() => onDelete(user)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
});

// メモ化されたユーザー編集ダイアログ
const UserDialog = memo(({
  open,
  user,
  onClose,
  onSave,
}: {
  open: boolean;
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (userData: Partial<User>) => void;
}) => {
  const [formData, setFormData] = useDebounceState<Partial<User>>(
    user || {
      name: '',
      email: '',
      role: 'user',
      status: 'active',
    }
  );

  const handleChange = (field: keyof User, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = useMemo(() => {
    return (
      formData.name?.trim() !== '' &&
      formData.email?.trim() !== '' &&
      formData.role &&
      formData.status
    );
  }, [formData]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {user ? 'ユーザー編集' : 'ユーザー追加'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="名前"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            fullWidth
          />
          <TextField
            label="メールアドレス"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>役割</InputLabel>
            <Select
              value={formData.role || ''}
              label="役割"
              onChange={(e) => handleChange('role', e.target.value)}
            >
              <MenuItem value="admin">管理者</MenuItem>
              <MenuItem value="user">一般ユーザー</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>ステータス</InputLabel>
            <Select
              value={formData.status || ''}
              label="ステータス"
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <MenuItem value="active">有効</MenuItem>
              <MenuItem value="inactive">無効</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button
          onClick={() => onSave(formData)}
          variant="contained"
          disabled={!isValid}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// メモ化された削除確認ダイアログ
const DeleteConfirmDialog = memo(({
  open,
  user,
  onClose,
  onConfirm,
}: {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => void;
}) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>ユーザー削除の確認</DialogTitle>
    <DialogContent>
      <Typography>
        ユーザー「{user?.name}」を削除してもよろしいですか？
        この操作は取り消せません。
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>キャンセル</Button>
      <Button onClick={onConfirm} color="error" variant="contained">
        削除
      </Button>
    </DialogActions>
  </Dialog>
));

export const UserManagement = () => {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.admin);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useDebounceState('', 300);

  // ソート済みユーザーリスト
  const sortedUsers = useSortedData(users, 'name');

  // 検索フィルター
  const filteredUsers = useFilteredData(sortedUsers, (user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleEditUser = useCallback((user: User) => {
    setEditUser(user);
  }, []);

  const handleDeleteUser = useCallback((user: User) => {
    setDeleteTargetUser(user);
  }, []);

  const handleSaveUser = useCallback(async (userData: Partial<User>) => {
    try {
      if (editUser) {
        await dispatch(updateUser({ id: editUser.id, ...userData })).unwrap();
      } else {
        await dispatch(createUser(userData)).unwrap();
      }
      setEditUser(null);
      setShowAddDialog(false);
    } catch (error) {
      // エラーはadminSliceで処理されます
    }
  }, [editUser]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTargetUser) {
      try {
        await dispatch(deleteUser(deleteTargetUser.id)).unwrap();
        setDeleteTargetUser(null);
      } catch (error) {
        // エラーはadminSliceで処理されます
      }
    }
  }, [deleteTargetUser]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">ユーザー管理</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            size="small"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddDialog(true)}
          >
            ユーザー追加
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>名前</TableCell>
              <TableCell>メールアドレス</TableCell>
              <TableCell>役割</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <UserDialog
        open={editUser !== null || showAddDialog}
        user={editUser}
        onClose={() => {
          setEditUser(null);
          setShowAddDialog(false);
        }}
        onSave={handleSaveUser}
      />

      <DeleteConfirmDialog
        open={deleteTargetUser !== null}
        user={deleteTargetUser}
        onClose={() => setDeleteTargetUser(null)}
        onConfirm={handleConfirmDelete}
      />
    </Box>
  );
};
