import { memo, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { updateSettings } from '../../store/slices/adminSlice';
import { SystemSettings as Settings } from '../../types/admin';
import { useDebounceState, useFetchData } from '../../hooks/useOptimization';

// メモ化された設定セクション
const SettingSection = memo(({ title, children }: {
  title: string;
  children: React.ReactNode;
}) => (
  <Paper sx={{ p: 3 }}>
    <Typography variant="subtitle1" gutterBottom>
      {title}
    </Typography>
    <Divider sx={{ mb: 2 }} />
    {children}
  </Paper>
));

// メモ化されたドメインリスト
const DomainList = memo(({
  domains,
  onRemove,
}: {
  domains: string[];
  onRemove: (domain: string) => void;
}) => (
  <Box sx={{ mb: 2 }}>
    {domains.map((domain) => (
      <Chip
        key={domain}
        label={domain}
        onDelete={() => onRemove(domain)}
        sx={{ mr: 1, mb: 1 }}
      />
    ))}
  </Box>
));

export const SystemSettings = () => {
  const dispatch = useAppDispatch();
  const { settings } = useAppSelector((state) => state.admin);
  const [formData, setFormData] = useDebounceState<Settings>(settings, 300);
  const [newDomain, setNewDomain] = useDebounceState('', 300);
  const [hasChanges, setHasChanges] = useDebounceState(false, 300);

  // 設定の変更を処理
  const handleChange = useCallback((
    section: keyof Settings,
    field: string,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  }, []);

  // ドメインの追加
  const handleAddDomain = useCallback(() => {
    if (newDomain && !formData.securitySettings.allowedDomains.includes(newDomain)) {
      handleChange('securitySettings', 'allowedDomains', [
        ...formData.securitySettings.allowedDomains,
        newDomain,
      ]);
      setNewDomain('');
    }
  }, [newDomain, formData.securitySettings.allowedDomains]);

  // ドメインの削除
  const handleRemoveDomain = useCallback((domain: string) => {
    handleChange('securitySettings', 'allowedDomains', 
      formData.securitySettings.allowedDomains.filter((d) => d !== domain)
    );
  }, [formData.securitySettings.allowedDomains]);

  // 設定の保存
  const handleSubmit = useCallback(async () => {
    try {
      await dispatch(updateSettings(formData)).unwrap();
      setHasChanges(false);
    } catch (error) {
      // エラーはadminSliceで処理されます
    }
  }, [formData]);

  // OCR設定セクション
  const OcrSettings = useMemo(() => (
    <SettingSection title="OCR設定">
      <FormControlLabel
        control={
          <Switch
            checked={formData.ocrSettings.enabled}
            onChange={(e) =>
              handleChange('ocrSettings', 'enabled', e.target.checked)
            }
          />
        }
        label="OCR処理を有効化"
        sx={{ mb: 2, display: 'block' }}
      />

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>デフォルト言語</InputLabel>
        <Select
          value={formData.ocrSettings.defaultLanguage}
          label="デフォルト言語"
          onChange={(e) =>
            handleChange('ocrSettings', 'defaultLanguage', e.target.value)
          }
        >
          <MenuItem value="ja">日本語</MenuItem>
          <MenuItem value="en">英語</MenuItem>
          <MenuItem value="auto">自動検出</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="処理タイムアウト（秒）"
        type="number"
        value={formData.ocrSettings.processingTimeout}
        onChange={(e) =>
          handleChange('ocrSettings', 'processingTimeout', Number(e.target.value))
        }
      />
    </SettingSection>
  ), [formData.ocrSettings]);

  // ストレージ設定セクション
  const StorageSettings = useMemo(() => (
    <SettingSection title="ストレージ設定">
      <TextField
        fullWidth
        label="最大ファイルサイズ（MB）"
        type="number"
        value={formData.storageSettings.maxFileSize / (1024 * 1024)}
        onChange={(e) =>
          handleChange(
            'storageSettings',
            'maxFileSize',
            Number(e.target.value) * 1024 * 1024
          )
        }
        sx={{ mb: 2 }}
      />

      <Typography variant="body2" gutterBottom>
        許可するファイル形式
      </Typography>
      <Box sx={{ mb: 2 }}>
        {formData.storageSettings.allowedFileTypes.map((type) => (
          <Chip
            key={type}
            label={type}
            onDelete={() =>
              handleChange(
                'storageSettings',
                'allowedFileTypes',
                formData.storageSettings.allowedFileTypes.filter(
                  (t) => t !== type
                )
              )
            }
            sx={{ mr: 1, mb: 1 }}
          />
        ))}
        <Chip
          icon={<AddIcon />}
          label="追加"
          onClick={() =>
            handleChange('storageSettings', 'allowedFileTypes', [
              ...formData.storageSettings.allowedFileTypes,
              '.pdf',
            ])
          }
          color="primary"
          variant="outlined"
        />
      </Box>
    </SettingSection>
  ), [formData.storageSettings]);

  // セキュリティ設定セクション
  const SecuritySettings = useMemo(() => (
    <SettingSection title="セキュリティ設定">
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="セッションタイムアウト（秒）"
            type="number"
            value={formData.securitySettings.sessionTimeout}
            onChange={(e) =>
              handleChange(
                'securitySettings',
                'sessionTimeout',
                Number(e.target.value)
              )
            }
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="最大ログイン試行回数"
            type="number"
            value={formData.securitySettings.maxLoginAttempts}
            onChange={(e) =>
              handleChange(
                'securitySettings',
                'maxLoginAttempts',
                Number(e.target.value)
              )
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="body2" gutterBottom>
            許可ドメイン
          </Typography>
          <DomainList
            domains={formData.securitySettings.allowedDomains}
            onRemove={handleRemoveDomain}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleAddDomain}
              disabled={!newDomain}
            >
              追加
            </Button>
          </Box>
        </Grid>
      </Grid>
    </SettingSection>
  ), [formData.securitySettings, newDomain]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        システム設定
      </Typography>

      {hasChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          未保存の変更があります
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {OcrSettings}
        </Grid>
        <Grid item xs={12} md={6}>
          {StorageSettings}
        </Grid>
        <Grid item xs={12}>
          {SecuritySettings}
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!hasChanges}
        >
          設定を保存
        </Button>
      </Box>
    </Box>
  );
};
