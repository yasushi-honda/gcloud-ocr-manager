import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  CircularProgress,
  Button,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchFileDetails, downloadFile } from '../../store/slices/fileSlice';
import { addNotification } from '../../store/slices/uiSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`file-tabpanel-${index}`}
      aria-labelledby={`file-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export const FileViewer = () => {
  const { fileId } = useParams<{ fileId: string }>();
  const dispatch = useAppDispatch();
  const { selectedFile, loading } = useAppSelector((state) => state.file);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (fileId) {
      dispatch(fetchFileDetails(fileId));
    }
  }, [dispatch, fileId]);

  const handleDownload = async () => {
    if (fileId) {
      try {
        await dispatch(downloadFile(fileId)).unwrap();
        dispatch(
          addNotification({
            type: 'success',
            message: 'ダウンロードを開始しました',
          })
        );
      } catch (error) {
        dispatch(
          addNotification({
            type: 'error',
            message: 'ダウンロードに失敗しました',
          })
        );
      }
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!selectedFile) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Typography>ファイルが見つかりません</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Paper sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{selectedFile.name}</Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            ダウンロード
          </Button>
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          アップロード日時: {new Date(selectedFile.createdAt).toLocaleString('ja-JP')}
        </Typography>
      </Paper>

      <Paper>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="プレビュー" />
          <Tab label="OCRテキスト" disabled={!selectedFile.ocrText} />
          <Tab label="メタデータ" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          {selectedFile.type === 'image' ? (
            <Box
              component="img"
              src={selectedFile.url}
              alt={selectedFile.name}
              sx={{
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
            />
          ) : selectedFile.type === 'pdf' ? (
            <Box
              component="iframe"
              src={selectedFile.url}
              sx={{
                width: '100%',
                height: '600px',
                border: 'none',
              }}
            />
          ) : (
            <Typography>このファイル形式はプレビューに対応していません</Typography>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Typography
            component="pre"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
            }}
          >
            {selectedFile.ocrText}
          </Typography>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            <Typography variant="subtitle2">ファイル名</Typography>
            <Typography paragraph>{selectedFile.name}</Typography>

            <Typography variant="subtitle2">ファイルサイズ</Typography>
            <Typography paragraph>
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>

            <Typography variant="subtitle2">MIME タイプ</Typography>
            <Typography paragraph>{selectedFile.mimeType}</Typography>

            <Typography variant="subtitle2">OCR ステータス</Typography>
            <Typography paragraph>{selectedFile.ocrStatus}</Typography>

            <Typography variant="subtitle2">作成日時</Typography>
            <Typography paragraph>
              {new Date(selectedFile.createdAt).toLocaleString('ja-JP')}
            </Typography>

            <Typography variant="subtitle2">最終更新日時</Typography>
            <Typography paragraph>
              {new Date(selectedFile.updatedAt).toLocaleString('ja-JP')}
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};
