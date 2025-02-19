export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
}

export interface SystemSettings {
  ocrSettings: {
    enabled: boolean;
    defaultLanguage: string;
    processingTimeout: number;
  };
  storageSettings: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  securitySettings: {
    allowedDomains: string[];
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
}

export interface AdminState {
  users: User[];
  settings: SystemSettings;
  loading: boolean;
  error: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress: string;
}

export interface Metrics {
  activeUsers: number;
  totalFiles: number;
  ocrProcessed: number;
  storageUsed: number;
  errorRate: number;
}
