import { memo, useCallback, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useTheme } from '@mui/material/styles';
import { useFetchData, useCache } from '../../hooks/useOptimization';
import { AdminService } from '../../api/services/admin.service';

// メモ化されたメトリックカード
const MetricCard = memo(({ title, value, unit, color }: {
  title: string;
  value: number;
  unit: string;
  color: string;
}) => (
  <Paper
    sx={{
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      height: 140,
      borderTop: `4px solid ${color}`,
    }}
  >
    <Typography variant="h6" gutterBottom>
      {title}
    </Typography>
    <Typography variant="h4" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
      {value.toLocaleString()}
      <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
        {unit}
      </Typography>
    </Typography>
  </Paper>
));

// メモ化されたチャートコンポーネント
const MetricsChart = memo(({ data, dataKey, color }: {
  data: any[];
  dataKey: string;
  color: string;
}) => {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const MetricsDashboard = () => {
  const theme = useTheme();
  const [period, setPeriod] = useCache('metrics-period', 'day');

  // メトリックスデータの取得
  const { data: metricsData, loading, error } = useFetchData(
    async () => {
      const adminService = new AdminService();
      return adminService.getMetrics(period);
    },
    [period]
  );

  // 集計データの計算
  const aggregatedData = useMemo(() => {
    if (!metricsData) return null;

    return {
      activeUsers: metricsData.activeUsers.reduce((sum, item) => sum + item.value, 0),
      storageUsage: metricsData.storageUsage[metricsData.storageUsage.length - 1]?.value || 0,
      processedFiles: metricsData.processedFiles.reduce((sum, item) => sum + item.value, 0),
      errorRate: metricsData.errorRate.reduce((sum, item) => sum + item.value, 0) / metricsData.errorRate.length,
    };
  }, [metricsData]);

  const handlePeriodChange = useCallback((
    event: React.MouseEvent<HTMLElement>,
    newPeriod: string,
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  }, []);

  if (error) {
    return (
      <Typography color="error">
        エラーが発生しました: {error.message}
      </Typography>
    );
  }

  if (loading || !aggregatedData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">システムメトリックス</Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          aria-label="期間選択"
          size="small"
        >
          <ToggleButton value="day">24時間</ToggleButton>
          <ToggleButton value="week">週間</ToggleButton>
          <ToggleButton value="month">月間</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* メトリックカード */}
        <Grid item xs={12} md={3}>
          <MetricCard
            title="アクティブユーザー"
            value={aggregatedData.activeUsers}
            unit="ユーザー"
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="ストレージ使用量"
            value={Math.round(aggregatedData.storageUsage / (1024 * 1024))}
            unit="MB"
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="処理済みファイル"
            value={aggregatedData.processedFiles}
            unit="ファイル"
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard
            title="エラー率"
            value={Math.round(aggregatedData.errorRate * 100) / 100}
            unit="%"
            color={theme.palette.error.main}
          />
        </Grid>

        {/* チャート */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              アクティブユーザー推移
            </Typography>
            <MetricsChart
              data={metricsData.activeUsers}
              dataKey="value"
              color={theme.palette.primary.main}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              ストレージ使用量推移
            </Typography>
            <MetricsChart
              data={metricsData.storageUsage.map(item => ({
                ...item,
                value: Math.round(item.value / (1024 * 1024)),
              }))}
              dataKey="value"
              color={theme.palette.secondary.main}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              処理済みファイル数推移
            </Typography>
            <MetricsChart
              data={metricsData.processedFiles}
              dataKey="value"
              color={theme.palette.success.main}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              エラー率推移
            </Typography>
            <MetricsChart
              data={metricsData.errorRate}
              dataKey="value"
              color={theme.palette.error.main}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
