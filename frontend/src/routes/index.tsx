import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { MainLayout } from '../components/layouts/MainLayout';
import { FileExplorer } from '../components/FileExplorer/FileExplorer';
import { FileViewer } from '../components/FileExplorer/FileViewer';
import { AdminDashboard } from '../components/Admin/AdminDashboard';
import { LoginForm } from '../components/auth/LoginForm';
import { NotFound } from '../components/error/NotFound';
import { AuthGuard } from '../components/auth/AuthGuard';
import { ErrorBoundary } from '../components/error/ErrorBoundary';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginForm />,
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <MainLayout />
      </AuthGuard>
    ),
    errorElement: <ErrorBoundary><NotFound /></ErrorBoundary>,
    children: [
      {
        path: '/',
        element: <FileExplorer />,
      },
      {
        path: '/files/:folderId',
        element: <FileExplorer />,
      },
      {
        path: '/files/view/:fileId',
        element: <FileViewer />,
      },
      {
        path: '/search',
        element: <FileExplorer />,
      },
      {
        path: '/admin',
        element: (
          <AuthGuard requireAdmin>
            <AdminDashboard />
          </AuthGuard>
        ),
      },
    ],
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
