import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  LinearProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Close as CloseIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { uploadFile } from '../../store/slices/fileSlice';
import { addNotification } from '../../store/slices/uiSlice';

export const FileUploader = () => {
  const dispatch = useAppDispatch();
  const uploadProgress = useAppSelector((state) => state.file.uploadProgress);
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
  });

  const handleUpload = async (file: File) => {
    try {
      await dispatch(
        uploadFile({
          file,
          onProgress: (progress) =>
            dispatch({
              type: 'file/setUploadProgress',
              payload: { fileId: file.name, progress },
            }),
        })
      ).unwrap();

      dispatch(
        addNotification({
          type: 'success',
          message: `${file.name}のアップロードが完了しました`,
        })
      );

      setFiles((prev) => prev.filter((f) => f !== file));
    } catch (error) {
      dispatch(
        addNotification({
          type: 'error',
          message: `${file.name}のアップロードに失敗しました`,
        })
      );
    }
  };

  const handleRemove = (file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file));
  };

  return (
    <Box>
      <Paper
        {...getRootProps()}
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: (theme) =>
            isDragActive ? theme.palette.action.hover : theme.palette.background.paper,
          border: (theme) => `2px dashed ${theme.palette.divider}`,
        }}
      >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          ファイルをドラッグ＆ドロップ
        </Typography>
        <Typography color="textSecondary">
          または、クリックしてファイルを選択してください
        </Typography>
      </Paper>

      {files.length > 0 && (
        <List>
          {files.map((file, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={file.name}
                secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
              />
              <ListItemSecondaryAction>
                {uploadProgress[file.name] !== undefined ? (
                  <Box sx={{ width: 100 }}>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress[file.name]}
                    />
                  </Box>
                ) : (
                  <IconButton edge="end" onClick={() => handleRemove(file)}>
                    <CloseIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => files.forEach(handleUpload)}
          >
            アップロード開始
          </Button>
        </Box>
      )}
    </Box>
  );
};
