import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../api/client';

interface MetricsState {
  activeUsers: number;
  storageUsage: number;
  processingJobs: number;
  timeSeriesData: Array<{
    timestamp: string;
    value: number;
  }>;
}

interface AdminState {
  metrics: MetricsState;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  metrics: {
    activeUsers: 0,
    storageUsage: 0,
    processingJobs: 0,
    timeSeriesData: [],
  },
  loading: false,
  error: null,
};

export const fetchMetrics = createAsyncThunk(
  'admin/fetchMetrics',
  async (period: string) => {
    const response = await apiClient.get(`/api/admin/metrics?period=${period}`);
    return response.data;
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMetrics.fulfilled, (state, action: PayloadAction<MetricsState>) => {
        state.metrics = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'メトリクスの取得に失敗しました';
      });
  },
});

export const adminReducer = adminSlice.reducer;
