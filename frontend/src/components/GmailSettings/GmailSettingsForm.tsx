import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Paper,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import { GmailSettings } from '../../types/gmail-settings';
import { GmailSettingsService } from '../../services/gmail-settings.service';

interface GmailSettingsFormProps {
  settings?: GmailSettings;
  onSubmit: (settings: Partial<GmailSettings>) => Promise<void>;
}

export const GmailSettingsForm: React.FC<GmailSettingsFormProps> = ({
  settings,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<Partial<GmailSettings>>({
    targetLabels: [],
    targetFolderId: '',
    folderName: '',
    enabled: true,
  });
  const [labels, setLabels] = useState<{ id: string; name: string; }[]>([]);
  const [folders, setFolders] = useState<{ id: string; name: string; }[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
    loadLabelsAndFolders();
  }, [settings]);

  const loadLabelsAndFolders = async () => {
    try {
      const [labelsData, foldersData] = await Promise.all([
        GmailSettingsService.getGmailLabels(),
        GmailSettingsService.getDriveFolders(),
      ]);
      setLabels(labelsData);
      setFolders(foldersData);
    } catch (err) {
      setError('データの読み込みに失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      await onSubmit(formData);
      setSuccess(true);
    } catch (err) {
      setError('設定の保存に失敗しました');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Gmail連携設定
            </Typography>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {success && (
            <Grid item xs={12}>
              <Alert severity="success">設定を保存しました</Alert>
            </Grid>
          )}

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>監視対象のGmailラベル</InputLabel>
              <Select
                multiple
                value={formData.targetLabels || []}
                onChange={(e) => setFormData({
                  ...formData,
                  targetLabels: e.target.value as string[],
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip
                        key={value}
                        label={labels.find(l => l.id === value)?.name || value}
                      />
                    ))}
                  </Box>
                )}
              >
                {labels.map((label) => (
                  <MenuItem key={label.id} value={label.id}>
                    {label.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>保存先フォルダ</InputLabel>
              <Select
                value={formData.targetFolderId || ''}
                onChange={(e) => {
                  const folder = folders.find(f => f.id === e.target.value);
                  setFormData({
                    ...formData,
                    targetFolderId: e.target.value as string,
                    folderName: folder?.name || '',
                  });
                }}
              >
                {folders.map((folder) => (
                  <MenuItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.enabled}
                  onChange={(e) => setFormData({
                    ...formData,
                    enabled: e.target.checked,
                  })}
                />
              }
              label="この設定を有効にする"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
            >
              設定を保存
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};
