import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MetricsDashboard } from '../MetricsDashboard';
import { adminReducer } from '../../../store/slices/adminSlice';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../../theme';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ja from 'date-fns/locale/ja';

// APIクライアントのモック
jest.mock('../../../api/client', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      activeUsers: 100,
      storageUsage: 5000000,
      processingJobs: 25,
      metrics: [
        { timestamp: '2025-02-19T10:00:00Z', value: 80 },
        { timestamp: '2025-02-19T11:00:00Z', value: 90 },
        { timestamp: '2025-02-19T12:00:00Z', value: 100 }
      ]
    }
  }))
}));

const mockStore = configureStore({
  reducer: {
    admin: adminReducer
  },
  preloadedState: {
    admin: {
      metrics: {
        activeUsers: 100,
        storageUsage: 5000000,
        processingJobs: 25,
        timeSeriesData: [
          { timestamp: '2025-02-19T10:00:00Z', value: 80 },
          { timestamp: '2025-02-19T11:00:00Z', value: 90 },
          { timestamp: '2025-02-19T12:00:00Z', value: 100 }
        ]
      },
      loading: false,
      error: null
    }
  }
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
          {component}
        </LocalizationProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('MetricsDashboard', () => {
  beforeEach(() => {
    renderWithProviders(<MetricsDashboard />);
  });

  it('メトリクスカードが正しく表示される', async () => {
    await waitFor(() => {
      expect(screen.getByText('アクティブユーザー')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('ストレージ使用量')).toBeInTheDocument();
      expect(screen.getByText('4.77 MB')).toBeInTheDocument();
      expect(screen.getByText('処理中のジョブ')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('期間選択が機能する', async () => {
    const periodSelect = screen.getByLabelText('表示期間');
    fireEvent.mouseDown(periodSelect);
    fireEvent.click(screen.getByText('週間'));
    
    await waitFor(() => {
      expect(periodSelect).toHaveValue('weekly');
    });
  });

  it('グラフが表示される', async () => {
    await waitFor(() => {
      const chart = screen.getByTestId('metrics-chart');
      expect(chart).toBeInTheDocument();
      
      const lines = chart.querySelectorAll('.recharts-line');
      expect(lines.length).toBeGreaterThan(0);
    });
  });
});
