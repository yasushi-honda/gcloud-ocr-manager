import { useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useAppSelector, useAppDispatch } from '../../hooks';
import { removeNotification } from '../../store/slices/uiSlice';

export const Notification = () => {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.ui.notifications);

  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        dispatch(removeNotification(notifications[0].id));
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [notifications, dispatch]);

  if (notifications.length === 0) return null;

  const { id, type, message } = notifications[0];

  return (
    <Snackbar
      open={true}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={6000}
      onClose={() => dispatch(removeNotification(id))}
    >
      <Alert onClose={() => dispatch(removeNotification(id))} severity={type} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};
