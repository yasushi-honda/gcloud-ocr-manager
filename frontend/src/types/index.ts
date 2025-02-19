// ユーザー関連の型定義
export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
}

// ファイル関連の型定義
export interface File {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size?: number;
  path: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  ocrResult?: OcrResult;
}

// OCR結果の型定義
export interface OcrResult {
  text: string;
  confidence: number;
  processedAt: string;
  language?: string;
  pages?: {
    pageNumber: number;
    text: string;
    confidence: number;
  }[];
}

// API応答の型定義
export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// システム設定の型定義
export interface SystemSettings {
  storageQuota: number;
  allowedFileTypes: string[];
  maxFileSize: number;
  ocrSettings: {
    defaultLanguage: string;
    supportedLanguages: string[];
    minConfidence: number;
  };
}

// 監査ログの型定義
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  timestamp: string;
  ip?: string;
}
