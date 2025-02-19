import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './theme';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { Notification } from './components/common/Notification';
import { GmailSettingsList } from './components/GmailSettings/GmailSettingsList';
import { PrivateRoute } from './components/common/PrivateRoute';
import { Sidebar } from './components/common/Sidebar';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div style={{ display: 'flex' }}>
            <Sidebar />
            <main style={{ flexGrow: 1, padding: '20px' }}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <PrivateRoute>
                      <div>Home</div>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/gmail-settings"
                  element={
                    <PrivateRoute>
                      <GmailSettingsList />
                    </PrivateRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </Router>
        <LoadingOverlay />
        <Notification />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
