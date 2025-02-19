import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { ApiResponse } from '../../types';

export class AuthService {
  // ログイン
  static async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ token: string; user: any }>> {
    const response = await apiClient.post<{ token: string; user: any }>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
    }

    return response;
  }

  // ログアウト
  static async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      localStorage.removeItem('auth_token');
    }
  }

  // トークンのリフレッシュ
  static async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await apiClient.post<{ token: string }>(API_ENDPOINTS.AUTH.REFRESH_TOKEN);

    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
    }

    return response;
  }

  // 認証状態の確認
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }
}
