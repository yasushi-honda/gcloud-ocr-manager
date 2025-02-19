import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// テスト用のモックデータ
export const mockFiles = [
  {
    id: '1',
    name: 'test-document.pdf',
    type: 'file',
    size: 1024,
    path: '/documents/test-document.pdf',
    createdAt: '2025-02-19T10:00:00Z',
    updatedAt: '2025-02-19T10:00:00Z',
    createdBy: 'user1',
    ocrStatus: 'completed',
  },
  {
    id: '2',
    name: '請求書フォルダ',
    type: 'folder',
    path: '/documents/請求書フォルダ',
    createdAt: '2025-02-19T09:00:00Z',
    updatedAt: '2025-02-19T09:00:00Z',
    createdBy: 'user1',
  },
];

export const mockUser = {
  id: 'user1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'user',
  createdAt: '2025-02-19T08:00:00Z',
};

export * from '@testing-library/react';
export { customRender as render };
