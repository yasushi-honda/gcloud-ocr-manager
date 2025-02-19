import { apiClient } from '../client';
import { User, SystemSettings, AuditLog } from '../../types/admin';

export interface AuditLogParams {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export class AdminService {
  async getUsers(): Promise<User[]> {
    const response = await apiClient.get('/admin/users');
    return response.data;
  }

  async getUser(userId: string): Promise<User> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const response = await apiClient.put(`/admin/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}`);
  }

  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  }

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const response = await apiClient.put('/admin/settings', settings);
    return response.data;
  }

  async getAuditLogs(params: AuditLogParams): Promise<AuditLogResponse> {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  }

  async exportAuditLogs(params: AuditLogParams): Promise<Blob> {
    const response = await apiClient.get('/admin/audit-logs/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  }

  async getMetrics(period: 'day' | 'week' | 'month' = 'day') {
    const response = await apiClient.get('/admin/metrics', {
      params: { period },
    });
    return response.data;
  }
}
