import { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Article as ArticleIcon,
  Folder as FolderIcon,
  CalendarToday as CalendarIcon,
  TextFields as TextFieldsIcon,
} from '@mui/icons-material';
import { useAppDispatch } from '../../hooks';
import { searchFiles } from '../../store/slices/fileSlice';
import { debounce } from 'lodash';

interface SearchFilters {
  type: string;
  dateRange: string;
  hasOcr: string;
}

export const SearchBar = () => {
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    type: 'all',
    dateRange: 'all',
    hasOcr: 'all',
  });

  // 検索実行を遅延させる
  const debouncedSearch = debounce((query: string, filters: SearchFilters) => {
    dispatch(searchFiles({ query, filters }));
  }, 500);

  useEffect(() => {
    if (searchQuery) {
      debouncedSearch(searchQuery, filters);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, filters]);

  const handleFilterChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleClear = () => {
    setSearchQuery('');
    setFilters({
      type: 'all',
      dateRange: 'all',
      hasOcr: 'all',
    });
    dispatch(searchFiles({ query: '', filters: { type: 'all', dateRange: 'all', hasOcr: 'all' } }));
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="ファイル名、OCRテキストを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton onClick={handleClear} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>ファイル種類</InputLabel>
            <Select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              label="ファイル種類"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="file">ファイル</MenuItem>
              <MenuItem value="folder">フォルダ</MenuItem>
              <MenuItem value="pdf">PDF</MenuItem>
              <MenuItem value="image">画像</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>期間</InputLabel>
            <Select
              name="dateRange"
              value={filters.dateRange}
              onChange={handleFilterChange}
              label="期間"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="today">今日</MenuItem>
              <MenuItem value="week">過去1週間</MenuItem>
              <MenuItem value="month">過去1ヶ月</MenuItem>
              <MenuItem value="year">過去1年</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>OCR状態</InputLabel>
            <Select
              name="hasOcr"
              value={filters.hasOcr}
              onChange={handleFilterChange}
              label="OCR状態"
            >
              <MenuItem value="all">すべて</MenuItem>
              <MenuItem value="completed">OCR完了</MenuItem>
              <MenuItem value="processing">処理中</MenuItem>
              <MenuItem value="pending">未処理</MenuItem>
              <MenuItem value="failed">エラー</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {(searchQuery || filters.type !== 'all' || filters.dateRange !== 'all' || filters.hasOcr !== 'all') && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              適用中のフィルター:
            </Typography>
            {searchQuery && (
              <Chip
                label={`検索: ${searchQuery}`}
                onDelete={handleClear}
                size="small"
              />
            )}
            {filters.type !== 'all' && (
              <Chip
                label={`種類: ${filters.type}`}
                onDelete={() => handleFilterChange({ target: { name: 'type', value: 'all' } } as SelectChangeEvent)}
                size="small"
              />
            )}
            {filters.dateRange !== 'all' && (
              <Chip
                label={`期間: ${filters.dateRange}`}
                onDelete={() => handleFilterChange({ target: { name: 'dateRange', value: 'all' } } as SelectChangeEvent)}
                size="small"
              />
            )}
            {filters.hasOcr !== 'all' && (
              <Chip
                label={`OCR: ${filters.hasOcr}`}
                onDelete={() => handleFilterChange({ target: { name: 'hasOcr', value: 'all' } } as SelectChangeEvent)}
                size="small"
              />
            )}
          </Box>
        )}
      </Paper>
    </Box>
  );
};
