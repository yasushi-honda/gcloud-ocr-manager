import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { SystemService } from '../../api/services/system.service';
import { SystemSettings } from '../../types';

interface SystemState {
  settings: SystemSettings | null;
  stats: {
    totalUsers: number;
    totalFiles: number;
    storageUsed: number;
    ocrProcessed: number;
  } | null;
  health: {
    status: 'healthy' | 'degraded' | 'down';
    services: {
      database: 'up' | 'down';
      storage: 'up' | 'down';
      ocr: 'up' | 'down';
    };
    metrics: {
      cpuUsage: number;
      memoryUsage: number;
      apiLatency: number;
    };
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: SystemState = {
  settings: null,
  stats: null,
  health: null,
  loading: false,
  error: null,
};

// 非同期アクション
export const fetchSystemSettings = createAsyncThunk(
  'system/fetchSettings',
  async () => {
    const response = await SystemService.getSettings();
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data;
  }
);

export const fetchSystemStats = createAsyncThunk(
  'system/fetchStats',
  async () => {
    const response = await SystemService.getStats();
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data;
  }
);

export const fetchSystemHealth = createAsyncThunk(
  'system/fetchHealth',
  async () => {
    const response = await SystemService.checkHealth();
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.data;
  }
);

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // システム設定の取得
      .addCase(fetchSystemSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSystemSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchSystemSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'システム設定の取得に失敗しました';
      })
      // システム統計の取得
      .addCase(fetchSystemStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      })
      // システム健全性の取得
      .addCase(fetchSystemHealth.fulfilled, (state, action) => {
        state.health = action.payload;
      });
  },
});

export const { clearError } = systemSlice.actions;
export default systemSlice.reducer;
