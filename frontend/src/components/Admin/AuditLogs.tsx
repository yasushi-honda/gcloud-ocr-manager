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
  TextField,
  Button,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchAuditLogs, exportAuditLogs } from '../../store/slices/adminSlice';
import { AuditLog } from '../../types/admin';
import {
  useDebounceState,
  useFetchData,
  useInfiniteScroll,
  useFilteredData,
} from '../../hooks/useOptimization';

// メモ化されたフィルターコンポーネント
const LogFilters = memo(({
  filters,
  onFilterChange,
  onClearFilters,
}: {
  filters: {
    startDate: Date | null;
    endDate: Date | null;
    userId: string;
    action: string;
  };
  onFilterChange: (field: string, value: any) => void;
  onClearFilters: () => void;
}) => (
  <Paper sx={{ p: 2, mb: 2 }}>
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={12} md={3}>
        <DatePicker
          label="開始日"
          value={filters.startDate}
          onChange={(date) => onFilterChange('startDate', date)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <DatePicker
          label="終了日"
          value={filters.endDate}
          onChange={(date) => onFilterChange('endDate', date)}
          slotProps={{ textField: { fullWidth: true, size: 'small' } }}
        />
      </Grid>
      <Grid item xs={12} md={2}>
        <TextField
          fullWidth
          size="small"
          label="ユーザーID"
          value={filters.userId}
          onChange={(e) => onFilterChange('userId', e.target.value)}
        />
      </Grid>
      <Grid item xs={12} md={2}>
        <FormControl fullWidth size="small">
          <InputLabel>アクション</InputLabel>
          <Select
            value={filters.action}
            label="アクション"
            onChange={(e) => onFilterChange('action', e.target.value)}
          >
            <MenuItem value="">全て</MenuItem>
            <MenuItem value="create">作成</MenuItem>
            <MenuItem value="update">更新</MenuItem>
            <MenuItem value="delete">削除</MenuItem>
            <MenuItem value="login">ログイン</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={2}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            fullWidth
          >
            クリア
          </Button>
          <Button
            variant="contained"
            startIcon={<FilterIcon />}
            onClick={() => {}} // フィルター適用は自動
            fullWidth
          >
            フィルター
          </Button>
        </Box>
      </Grid>
    </Grid>
  </Paper>
));

// メモ化されたログ行コンポーネント
const LogRow = memo(({ log }: { log: AuditLog }) => {
  const getActionChip = (action: string) => {
    let color:
      | 'default'
      | 'primary'
      | 'secondary'
      | 'error'
      | 'info'
      | 'success'
      | 'warning' = 'default';
    switch (action) {
      case 'create':
        color = 'success';
        break;
      case 'update':
        color = 'info';
        break;
      case 'delete':
        color = 'error';
        break;
      case 'login':
        color = 'primary';
        break;
    }
    return <Chip label={action} color={color} size="small" />;
  };

  return (
    <TableRow>
      <TableCell>{new Date(log.timestamp).toLocaleString('ja-JP')}</TableCell>
      <TableCell>{log.userId}</TableCell>
      <TableCell>{getActionChip(log.action)}</TableCell>
      <TableCell>{log.resource}</TableCell>
      <TableCell>{log.details}</TableCell>
    </TableRow>
  );
});

export const AuditLogs = () => {
  const dispatch = useAppDispatch();
  const { auditLogs, loading } = useAppSelector((state) => state.admin);
  const [filters, setFilters] = useDebounceState({
    startDate: null,
    endDate: null,
    userId: '',
    action: '',
  }, 300);

  // 無限スクロール
  const { loadMore, hasMore } = useInfiniteScroll({
    items: auditLogs,
    loadMoreItems: () => {
      dispatch(fetchAuditLogs({ ...filters, page: auditLogs.length / 20 }));
    },
    itemsPerPage: 20,
  });

  // フィルター適用
  const filteredLogs = useFilteredData(auditLogs, (log) => {
    if (filters.startDate && new Date(log.timestamp) < filters.startDate) {
      return false;
    }
    if (filters.endDate && new Date(log.timestamp) > filters.endDate) {
      return false;
    }
    if (filters.userId && !log.userId.includes(filters.userId)) {
      return false;
    }
    if (filters.action && log.action !== filters.action) {
      return false;
    }
    return true;
  });

  // フィルター変更
  const handleFilterChange = useCallback((field: string, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  // フィルタークリア
  const handleClearFilters = useCallback(() => {
    setFilters({
      startDate: null,
      endDate: null,
      userId: '',
      action: '',
    });
  }, []);

  // CSVエクスポート
  const handleExport = useCallback(async () => {
    try {
      await dispatch(exportAuditLogs(filters)).unwrap();
    } catch (error) {
      // エラーはadminSliceで処理されます
    }
  }, [filters]);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">監査ログ</Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
        >
          CSVエクスポート
        </Button>
      </Box>

      <LogFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />

      {loading && <CircularProgress />}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>タイムスタンプ</TableCell>
              <TableCell>ユーザーID</TableCell>
              <TableCell>アクション</TableCell>
              <TableCell>リソース</TableCell>
              <TableCell>詳細</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLogs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {hasMore && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button onClick={loadMore} disabled={loading}>
            さらに読み込む
          </Button>
        </Box>
      )}
    </Box>
  );
};
