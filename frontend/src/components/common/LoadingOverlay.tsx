import { Backdrop, CircularProgress } from '@mui/material';
import { useAppSelector } from '../../hooks';

export const LoadingOverlay = () => {
  const isLoading = useAppSelector((state) => state.ui.loading.global);

  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  );
};
