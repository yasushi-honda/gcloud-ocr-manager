import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { ApiResponse, SystemSettings } from '../../types';

export class SystemService {
  // システム設定の取得
  static async getSettings(): Promise<ApiResponse<SystemSettings>> {
    return apiClient.get<SystemSettings>(API_ENDPOINTS.SYSTEM.SETTINGS);
  }

  // システム設定の更新
  static async updateSettings(settings: Partial<SystemSettings>): Promise<ApiResponse<SystemSettings>> {
    return apiClient.put<SystemSettings>(API_ENDPOINTS.SYSTEM.SETTINGS, settings);
  }

  // システム統計情報の取得
  static async getStats(): Promise<ApiResponse<{
    totalUsers: number;
    totalFiles: number;
    storageUsed: number;
    ocrProcessed: number;
  }>> {
    return apiClient.get(API_ENDPOINTS.SYSTEM.STATS);
  }

  // システム健全性チェック
  static async checkHealth(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    services: {
      database: 'up' | 'down';
      storage: 'up' | 'down';
      ocr: 'up' | 'down';
    };
    metrics: {
      cpuUsage: number;
      memoryUsage: number;
      apiLatency: number;
    };
  }>> {
    return apiClient.get(API_ENDPOINTS.SYSTEM.HEALTH);
  }
}
