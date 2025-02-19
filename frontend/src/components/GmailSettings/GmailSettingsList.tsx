import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  Typography,
  Alert,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { GmailSettings } from '../../types/gmail-settings';
import { GmailSettingsService } from '../../services/gmail-settings.service';
import { GmailSettingsForm } from './GmailSettingsForm';

export const GmailSettingsList: React.FC = () => {
  const [settings, setSettings] = useState<GmailSettings[]>([]);
  const [selectedSetting, setSelectedSetting] = useState<GmailSettings | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string>('');

  const loadSettings = async () => {
    try {
      const data = await GmailSettingsService.getSettings();
      setSettings(data);
    } catch (err) {
      setError('設定の読み込みに失敗しました');
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleCreate = async (newSettings: Partial<GmailSettings>) => {
    try {
      await GmailSettingsService.createSettings(newSettings as Omit<GmailSettings, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>);
      await loadSettings();
      setIsFormOpen(false);
    } catch (err) {
      setError('設定の作成に失敗しました');
    }
  };

  const handleUpdate = async (updatedSettings: Partial<GmailSettings>) => {
    if (!selectedSetting?.id) return;

    try {
      await GmailSettingsService.updateSettings(selectedSetting.id, updatedSettings);
      await loadSettings();
      setIsFormOpen(false);
      setSelectedSetting(null);
    } catch (err) {
      setError('設定の更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('この設定を削除してもよろしいですか？')) return;

    try {
      await GmailSettingsService.deleteSettings(id);
      await loadSettings();
    } catch (err) {
      setError('設定の削除に失敗しました');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Gmail連携設定</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            setSelectedSetting(null);
            setIsFormOpen(true);
          }}
        >
          新規設定
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>監視対象ラベル</TableCell>
              <TableCell>保存先フォルダ</TableCell>
              <TableCell>ステータス</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {setting.targetLabels.map((label) => (
                      <Chip key={label} label={label} size="small" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{setting.folderName}</TableCell>
                <TableCell>
                  <Chip
                    label={setting.enabled ? '有効' : '無効'}
                    color={setting.enabled ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => {
                      setSelectedSetting(setting);
                      setIsFormOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => setting.id && handleDelete(setting.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedSetting(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <GmailSettingsForm
            settings={selectedSetting || undefined}
            onSubmit={selectedSetting ? handleUpdate : handleCreate}
          />
        </Box>
      </Dialog>
    </Box>
  );
};
