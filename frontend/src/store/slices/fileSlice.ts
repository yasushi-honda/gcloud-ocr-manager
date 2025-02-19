import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { FileService } from '../../api/services/file.service';
import { File } from '../../types';
import { addNotification } from './uiSlice';

interface FileState {
  files: File[];
  selectedFile: File | null;
  loading: boolean;
  error: string | null;
  currentPath: string;
  view: 'grid' | 'list';
  sort: {
    field: 'name' | 'createdAt' | 'size';
    direction: 'asc' | 'desc';
  };
  search: string;
  uploadProgress: Record<string, number>;
  searchResults: File[];
  searchLoading: boolean;
  searchError: string | null;
}

const initialState: FileState = {
  files: [],
  selectedFile: null,
  loading: false,
  error: null,
  currentPath: '/',
  view: 'grid',
  sort: {
    field: 'name',
    direction: 'asc',
  },
  search: '',
  uploadProgress: {},
  searchResults: [],
  searchLoading: false,
  searchError: null,
};

// 非同期アクション
export const fetchFiles = createAsyncThunk(
  'file/fetchFiles',
  async (params: { path?: string; search?: string }) => {
    const response = await FileService.getFiles(params);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data;
  }
);

export const uploadFile = createAsyncThunk(
  'file/uploadFile',
  async ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) => {
    const response = await FileService.uploadFile(file, onProgress);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data;
  }
);

export const deleteFile = createAsyncThunk(
  'file/deleteFile',
  async (fileId: string) => {
    const response = await FileService.deleteFile(fileId);
    if (response.error) {
      throw new Error(response.error.message);
    }
    return fileId;
  }
);

export const searchFiles = createAsyncThunk(
  'file/search',
  async ({ query, filters }: { query: string; filters: any }, { dispatch }) => {
    try {
      const fileService = new FileService();
      const results = await fileService.searchFiles(query, filters);
      return results;
    } catch (error: any) {
      dispatch(
        addNotification({
          type: 'error',
          message: '検索中にエラーが発生しました',
        })
      );
      throw error;
    }
  }
);

const fileSlice = createSlice({
  name: 'file',
  initialState,
  reducers: {
    setSelectedFile: (state, action) => {
      state.selectedFile = action.payload;
    },
    setView: (state, action) => {
      state.view = action.payload;
    },
    setSort: (state, action) => {
      state.sort = action.payload;
    },
    setSearch: (state, action) => {
      state.search = action.payload;
    },
    setUploadProgress: (state, action) => {
      const { fileId, progress } = action.payload;
      state.uploadProgress[fileId] = progress;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ファイル一覧の取得
      .addCase(fetchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.files = action.payload;
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'ファイルの取得に失敗しました';
      })
      // 検索
      .addCase(searchFiles.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchFiles.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload;
      })
      .addCase(searchFiles.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.error.message || 'エラーが発生しました';
      })
      // ファイルのアップロード
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.files.push(action.payload);
        delete state.uploadProgress[action.payload.id];
      })
      // ファイルの削除
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.files = state.files.filter((file) => file.id !== action.payload);
        if (state.selectedFile?.id === action.payload) {
          state.selectedFile = null;
        }
      });
  },
});

export const {
  setSelectedFile,
  setView,
  setSort,
  setSearch,
  setUploadProgress,
  clearError,
} = fileSlice.actions;
export default fileSlice.reducer;
