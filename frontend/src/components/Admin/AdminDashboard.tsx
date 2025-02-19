import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchUsers, fetchSettings } from '../../store/slices/adminSlice';
import { UserManagement } from './UserManagement';
import { SystemSettings } from './SystemSettings';
import { MetricsDashboard } from './MetricsDashboard';
import { AuditLogs } from './AuditLogs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

export const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.admin);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    // 初期データの取得
    dispatch(fetchUsers());
    dispatch(fetchSettings());
  }, [dispatch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="80vh"
      >
        <Typography color="error">
          エラーが発生しました: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                aria-label="管理者ダッシュボード"
              >
                <Tab
                  icon={<AssessmentIcon />}
                  label="メトリクス"
                  {...a11yProps(0)}
                />
                <Tab
                  icon={<PeopleIcon />}
                  label="ユーザー管理"
                  {...a11yProps(1)}
                />
                <Tab
                  icon={<SettingsIcon />}
                  label="システム設定"
                  {...a11yProps(2)}
                />
                <Tab
                  icon={<HistoryIcon />}
                  label="監査ログ"
                  {...a11yProps(3)}
                />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <MetricsDashboard />
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              <UserManagement />
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              <SystemSettings />
            </TabPanel>
            <TabPanel value={activeTab} index={3}>
              <AuditLogs />
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
