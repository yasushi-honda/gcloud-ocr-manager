import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard = ({ children, requireAdmin = false }: AuthGuardProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!token) {
      // ログインしていない場合、ログインページにリダイレクト
      navigate('/login', {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    if (requireAdmin && user?.role !== 'admin') {
      // 管理者権限が必要なページで一般ユーザーの場合、ホームにリダイレクト
      navigate('/', { replace: true });
    }
  }, [token, user, navigate, location, requireAdmin]);

  // 認証チェック中は何も表示しない
  if (!token || (requireAdmin && user?.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
};
