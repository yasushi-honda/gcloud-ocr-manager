import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { ApiResponse, User } from '../../types';

export class UserService {
  // ユーザー一覧の取得
  static async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>(API_ENDPOINTS.USERS.LIST, params);
  }

  // ユーザーの作成
  static async createUser(userData: Omit<User, 'id'>): Promise<ApiResponse<User>> {
    return apiClient.post<User>(API_ENDPOINTS.USERS.CREATE, userData);
  }

  // ユーザーの更新
  static async updateUser(userId: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>(API_ENDPOINTS.USERS.UPDATE(userId), userData);
  }

  // ユーザーの削除
  static async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(API_ENDPOINTS.USERS.DELETE(userId));
  }

  // ユーザープロファイルの取得
  static async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<User>(API_ENDPOINTS.USERS.PROFILE);
  }

  // ユーザープロファイルの更新
  static async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return apiClient.put<User>(API_ENDPOINTS.USERS.PROFILE, profileData);
  }
}
