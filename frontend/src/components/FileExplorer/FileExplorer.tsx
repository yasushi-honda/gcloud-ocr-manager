import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Article as ArticleIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchFiles,
  deleteFile,
  downloadFile,
} from '../../store/slices/fileSlice';
import { FileUploader } from '../common/FileUploader';
import { SearchBar } from './SearchBar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { addNotification } from '../../store/slices/uiSlice';

export const FileExplorer = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { folderId } = useParams();
  const { files, loading, searchResults, searchLoading } = useAppSelector((state) => state.file);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const displayedFiles = searchResults.length > 0 ? searchResults : files;

  useEffect(() => {
    dispatch(fetchFiles(folderId));
  }, [dispatch, folderId]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDelete = async (file: any) => {
    setSelectedFile(file);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedFile) {
      try {
        await dispatch(deleteFile(selectedFile.id)).unwrap();
        dispatch(addNotification({
          type: 'success',
          message: 'ファイルを削除しました',
        }));
      } catch (error) {
        dispatch(addNotification({
          type: 'error',
          message: 'ファイルの削除に失敗しました',
        }));
      }
    }
    setDeleteDialogOpen(false);
  };

  const handleDownload = async (file: any) => {
    try {
      await dispatch(downloadFile(file.id)).unwrap();
      dispatch(addNotification({
        type: 'success',
        message: 'ダウンロードを開始しました',
      }));
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'ダウンロードに失敗しました',
      }));
    }
  };

  const handleView = (file: any) => {
    navigate(`/files/view/${file.id}`);
  };

  const getOcrStatus = (file: any) => {
    switch (file.ocrStatus) {
      case 'pending':
        return <Chip label="OCR待機中" color="warning" size="small" />;
      case 'processing':
        return <Chip label="OCR処理中" color="info" size="small" />;
      case 'completed':
        return <Chip label="OCR完了" color="success" size="small" />;
      case 'failed':
        return <Chip label="OCRエラー" color="error" size="small" />;
      default:
        return null;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <SearchBar />
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              ファイルアップロード
            </Typography>
            <FileUploader />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper>
            {(loading || searchLoading) && <LinearProgress />}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>種類</TableCell>
                    <TableCell>ファイル名</TableCell>
                    <TableCell>サイズ</TableCell>
                    <TableCell>アップロード日時</TableCell>
                    <TableCell>OCR状態</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedFiles
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          {file.type === 'folder' ? (
                            <FolderIcon color="primary" />
                          ) : (
                            <ArticleIcon color="action" />
                          )}
                        </TableCell>
                        <TableCell>{file.name}</TableCell>
                        <TableCell>
                          {file.type === 'folder'
                            ? `${file.itemCount}項目`
                            : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                        </TableCell>
                        <TableCell>
                          {new Date(file.createdAt).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>{getOcrStatus(file)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="表示">
                            <IconButton
                              onClick={() => handleView(file)}
                              disabled={file.type === 'folder'}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ダウンロード">
                            <IconButton
                              onClick={() => handleDownload(file)}
                              disabled={file.type === 'folder'}
                            >
                              <DownloadIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="削除">
                            <IconButton
                              onClick={() => handleDelete(file)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={displayedFiles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="表示件数"
            />
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="ファイルの削除"
        message={`${selectedFile?.name}を削除してもよろしいですか？`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmText="削除"
        cancelText="キャンセル"
        severity="error"
      />
    </Box>
  );
};
