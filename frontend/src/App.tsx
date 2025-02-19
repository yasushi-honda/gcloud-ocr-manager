import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppRouter } from './routes';
import { theme } from './theme';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { Notification } from './components/common/Notification';

// コンポーネントのインポート（後で実装）
const MainLayout = () => <div>Main Layout</div>;
const FileExplorer = () => <div>File Explorer</div>;
const AdminDashboard = () => <div>Admin Dashboard</div>;
const Login = () => <div>Login</div>;

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

const queryClient = new QueryClient();

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <LoadingOverlay />
          <Notification />
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/admin/*" element={<AdminDashboard />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<FileExplorer />} />
                {/* 追加のルートはここに */}
              </Route>
            </Routes>
          </Router>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
