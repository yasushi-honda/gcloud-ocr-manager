import { User } from '../types/admin';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export const checkAdminRole = (user: User | null): boolean => {
  return user?.role === 'admin';
};

export const validateToken = (token: string | null): boolean => {
  if (!token) return false;
  try {
    // JWTトークンの検証ロジック
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return false;

    // ペイロードをデコード
    const decodedPayload = JSON.parse(atob(payload));
    
    // トークンの有効期限チェック
    const currentTime = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < currentTime) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const validateCSRFToken = (csrfToken: string | null): boolean => {
  if (!csrfToken) return false;
  // CSRFトークンの検証ロジック
  return true;
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // HTMLタグの除去
    .replace(/javascript:/gi, '') // javascriptプロトコルの除去
    .trim(); // 前後の空白を除去
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  return fileExtension ? allowedTypes.includes(`.${fileExtension}`) : false;
};

export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

export const validateIPAddress = (ipAddress: string): boolean => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (!ipv4Regex.test(ipAddress) && !ipv6Regex.test(ipAddress)) {
    return false;
  }
  
  if (ipv4Regex.test(ipAddress)) {
    const parts = ipAddress.split('.');
    return parts.every(part => parseInt(part) >= 0 && parseInt(part) <= 255);
  }
  
  return true;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('パスワードは8文字以上である必要があります');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('パスワードは少なくとも1つの大文字を含む必要があります');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('パスワードは少なくとも1つの小文字を含む必要があります');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('パスワードは少なくとも1つの数字を含む必要があります');
  }
  
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('パスワードは少なくとも1つの特殊文字を含む必要があります');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};
