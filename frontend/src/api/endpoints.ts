// APIエンドポイントの定義
export const API_ENDPOINTS = {
  // 認証関連
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
  },

  // ファイル関連
  FILES: {
    LIST: '/files',
    UPLOAD: '/files/upload',
    DOWNLOAD: (fileId: string) => `/files/${fileId}/download`,
    DELETE: (fileId: string) => `/files/${fileId}`,
    UPDATE: (fileId: string) => `/files/${fileId}`,
    OCR_STATUS: (fileId: string) => `/files/${fileId}/ocr-status`,
    OCR_RESULT: (fileId: string) => `/files/${fileId}/ocr-result`,
  },

  // ユーザー関連
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (userId: string) => `/users/${userId}`,
    DELETE: (userId: string) => `/users/${userId}`,
    PROFILE: '/users/profile',
  },

  // システム関連
  SYSTEM: {
    SETTINGS: '/system/settings',
    STATS: '/system/stats',
    HEALTH: '/system/health',
  },

  // 監査ログ関連
  AUDIT: {
    LOGS: '/audit/logs',
  },
} as const;
