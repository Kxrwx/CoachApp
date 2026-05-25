import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class HttpService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      // Timeouts globaux
      timeout: 15000, // 15 secondes par défaut
      maxRedirects: 5,

      // Headers par défaut
      headers: {
        'User-Agent': 'CoachApp/1.0',
      },
    });

    // Interceptor pour les erreurs
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNABORTED') {
          const err = new Error(`Request timeout: ${error.config.url}`);
          err.name = 'TimeoutError';
          return Promise.reject(err);
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthode pour getter l'instance avec timeouts custom
  createWithTimeout(timeoutMs: number = 15000): AxiosInstance {
    return axios.create({
      timeout: timeoutMs,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'CoachApp/1.0',
      },
    });
  }

  // Wrappers pour les méthodes courantes
  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Pour les timeouts custom (ex: Strava qui peut être lent)
  async getWithTimeout<T = any>(
    url: string,
    timeoutMs: number = 15000,
    config?: AxiosRequestConfig
  ) {
    const instance = this.createWithTimeout(timeoutMs);
    return instance.get<T>(url, config);
  }

  async postWithTimeout<T = any>(
    url: string,
    data?: any,
    timeoutMs: number = 15000,
    config?: AxiosRequestConfig
  ) {
    const instance = this.createWithTimeout(timeoutMs);
    return instance.post<T>(url, data, config);
  }
}
