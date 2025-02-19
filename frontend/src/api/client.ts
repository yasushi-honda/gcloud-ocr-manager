import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { validateToken, validateCSRFToken } from '../middleware/auth.middleware';
import { addNotification } from '../store/slices/uiSlice';
import store from '../store';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class ApiClient {
  private client: AxiosInstance;
  private retryCount: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // リクエストインターセプター
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

        // トークンの検証
        if (!validateToken(token)) {
          store.dispatch(addNotification({
            type: 'error',
            message: '認証セッションが切れました。再ログインしてください。',
          }));
          throw new Error('Invalid token');
        }

        // CSRFトークンの検証
        if (!validateCSRFToken(csrfToken)) {
          store.dispatch(addNotification({
            type: 'error',
            message: 'セキュリティエラーが発生しました。',
          }));
          throw new Error('Invalid CSRF token');
        }

        // ヘッダーにトークンを設定
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        }

        // リクエストのサニタイズ
        if (config.params) {
          Object.keys(config.params).forEach(key => {
            if (typeof config.params[key] === 'string') {
              config.params[key] = this.sanitizeInput(config.params[key]);
            }
          });
        }

        if (config.data && typeof config.data === 'object') {
          Object.keys(config.data).forEach(key => {
            if (typeof config.data[key] === 'string') {
              config.data[key] = this.sanitizeInput(config.data[key]);
            }
          });
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.client.interceptors.response.use(
      (response) => {
        // レスポンスのサニタイズ
        if (typeof response.data === 'object') {
          this.sanitizeResponse(response.data);
        }
        return response;
      },
      async (error: AxiosError) => {
        if (!error.config) {
          return Promise.reject(error);
        }

        // リトライ可能なエラーの場合
        if (
          this.retryCount < MAX_RETRIES &&
          error.response?.status &&
          [408, 500, 502, 503, 504].includes(error.response.status)
        ) {
          this.retryCount++;
          await this.delay(RETRY_DELAY * this.retryCount);
          return this.client(error.config);
        }

        // エラーハンドリング
        let errorMessage = 'エラーが発生しました';
        if (error.response) {
          switch (error.response.status) {
            case 400:
              errorMessage = '不正なリクエストです';
              break;
            case 401:
              errorMessage = '認証エラーが発生しました';
              // 認証切れの場合はログアウト処理
              this.handleAuthError();
              break;
            case 403:
              errorMessage = 'アクセスが拒否されました';
              break;
            case 404:
              errorMessage = 'リソースが見つかりません';
              break;
            case 429:
              errorMessage = 'リクエスト制限を超えました';
              break;
            default:
              if (error.response.status >= 500) {
                errorMessage = 'サーバーエラーが発生しました';
              }
          }
        }

        store.dispatch(addNotification({
          type: 'error',
          message: errorMessage,
        }));

        return Promise.reject(error);
      }
    );
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  private sanitizeResponse(data: any) {
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (typeof item === 'object') {
          this.sanitizeResponse(item);
        }
      });
    } else if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string') {
          data[key] = this.sanitizeInput(data[key]);
        } else if (typeof data[key] === 'object') {
          this.sanitizeResponse(data[key]);
        }
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleAuthError() {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }
}

export const apiClient = new ApiClient();
