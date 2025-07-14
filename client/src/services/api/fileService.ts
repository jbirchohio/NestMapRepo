import apiClient from './apiClient';

export interface FileUploadResponse {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  name?: string;
  description?: string;
  tags?: string[];
  [key: string]: any;
}

class FileService {
  private static instance: FileService;
  private basePath = '/files';

  private constructor() {}

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  public async uploadFile(
    file: File,
    metadata?: FileMetadata,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return apiClient.post<FileUploadResponse>(
      `${this.basePath}/upload`,
      formData,
      {
        ...config,
        headers: {
          ...config?.headers,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      }
    );
  }

  public async uploadFiles(
    files: File[],
    metadata?: FileMetadata,
    onProgress?: (progress: number, fileIndex: number, file: File) => void,
    config?: RequestConfig
  ): Promise<FileUploadResponse[]> {
    const uploadPromises = files.map((file, index) => {
      const fileProgress = (progress: number) => {
        if (onProgress) onProgress(progress, index, file);
      };
      return this.uploadFile(file, metadata, fileProgress, config);
    });

    return Promise.all(uploadPromises);
  }

  public async getFileUrl(fileId: string, config?: RequestConfig): Promise<string> {
    return apiClient.get<string>(`${this.basePath}/${fileId}/url`, config);
  }

  public async downloadFile(
    fileId: string,
    fileName?: string,
    config?: RequestConfig
  ): Promise<void> {
    const response = await apiClient.get<Blob>(
      `${this.basePath}/${fileId}/download`,
      {
        ...config,
        responseType: 'blob',
      }
    );

    const url = window.URL.createObjectURL(new Blob([response]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || `file-${fileId}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  public async deleteFile(fileId: string, config?: RequestConfig): Promise<void> {
    return apiClient.delete<void>(`${this.basePath}/${fileId}`, config);
  }

  public async updateFileMetadata(
    fileId: string,
    metadata: Partial<FileMetadata>,
    config?: RequestConfig
  ): Promise<FileUploadResponse> {
    return apiClient.patch<FileUploadResponse>(
      `${this.basePath}/${fileId}/metadata`,
      metadata,
      config
    );
  }

  public async getFileMetadata(fileId: string, config?: RequestConfig): Promise<FileMetadata> {
    return apiClient.get<FileMetadata>(`${this.basePath}/${fileId}/metadata`, config);
  }

  public async generateFileUrl(fileId: string, expiresIn?: number): Promise<string> {
    const params = expiresIn ? { expiresIn } : undefined;
    const response = await apiClient.get<{ url: string }>(
      `${this.basePath}/${fileId}/generate-url`,
      { params }
    );
    return response.url;
  }
}

export const fileService = FileService.getInstance();

// Reuse the RequestConfig type from other services
type RequestConfig = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  responseType?: 'json' | 'blob' | 'arraybuffer' | 'document' | 'text' | 'stream';
  [key: string]: any;
};
