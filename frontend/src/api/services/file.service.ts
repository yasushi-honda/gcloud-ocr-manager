import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { ApiResponse, File } from '../../types';

export class FileService {
  // ファイル一覧の取得
  static async getFiles(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
  }): Promise<ApiResponse<File[]>> {
    return apiClient.get<File[]>(API_ENDPOINTS.FILES.LIST, params);
  }

  // ファイルのアップロード
  static async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<File>> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<File>(API_ENDPOINTS.FILES.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded * 100) / progressEvent.total;
          onProgress(progress);
        }
      },
    });
  }

  // ファイルの削除
  static async deleteFile(fileId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(API_ENDPOINTS.FILES.DELETE(fileId));
  }

  // ファイル情報の更新
  static async updateFile(fileId: string, data: Partial<File>): Promise<ApiResponse<File>> {
    return apiClient.put<File>(API_ENDPOINTS.FILES.UPDATE(fileId), data);
  }

  // OCRステータスの取得
  static async getOcrStatus(fileId: string): Promise<ApiResponse<{ status: string }>> {
    return apiClient.get(API_ENDPOINTS.FILES.OCR_STATUS(fileId));
  }

  // OCR結果の取得
  static async getOcrResult(fileId: string): Promise<ApiResponse<{ text: string; confidence: number }>> {
    return apiClient.get(API_ENDPOINTS.FILES.OCR_RESULT(fileId));
  }

  // ファイルのダウンロード
  static async downloadFile(fileId: string): Promise<Blob> {
    const response = await apiClient.get(API_ENDPOINTS.FILES.DOWNLOAD(fileId), {
      responseType: 'blob',
    });
    return response.data;
  }

  // ファイルの検索
  static async searchFiles(query: string, filters: any): Promise<ApiResponse<File[]>> {
    return apiClient.get<File[]>(API_ENDPOINTS.FILES.SEARCH, {
      params: {
        q: query,
        ...filters,
      },
    });
  }
}
