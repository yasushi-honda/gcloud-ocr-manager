import React from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('エラーが発生しました:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Container>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
            }}
          >
            <Typography variant="h4" gutterBottom>
              申し訳ありません
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              予期せぬエラーが発生しました
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              {this.state.error?.message}
            </Typography>
            <Box>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                sx={{ mr: 2 }}
              >
                ページを再読み込み
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.location.href = '/'}
              >
                ホームに戻る
              </Button>
            </Box>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

// 関数コンポーネント用のラッパー
export const ErrorFallback = () => {
  const navigate = useNavigate();

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" gutterBottom>
          申し訳ありません
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          予期せぬエラーが発生しました
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
            sx={{ mr: 2 }}
          >
            ページを再読み込み
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/')}
          >
            ホームに戻る
          </Button>
        </Box>
      </Box>
    </Container>
  );
};
