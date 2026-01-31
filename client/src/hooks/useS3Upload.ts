import { useState, useCallback } from 'react';

interface UploadResult {
  key: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface UseS3UploadOptions {
  context?: 'quote' | 'work' | 'supplier' | 'customer' | 'general';
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useS3Upload(options: UseS3UploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', options.context || 'general');

      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setProgress(100);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      options.onError?.(error);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('context', options.context || 'general');

      const response = await fetch('/api/s3/upload-multiple', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setProgress(100);
      return result.files;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      options.onError?.(error);
      return [];
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  const getFileUrl = useCallback(async (key: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/s3/url/${encodeURIComponent(key)}`);
      if (!response.ok) {
        throw new Error('Failed to get file URL');
      }
      const data = await response.json();
      return data.url;
    } catch (err) {
      console.error('Error getting file URL:', err);
      return null;
    }
  }, []);

  const deleteFile = useCallback(async (key: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/s3/delete/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (err) {
      console.error('Error deleting file:', err);
      return false;
    }
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    getFileUrl,
    deleteFile,
    isUploading,
    progress,
    error,
  };
}

export type { UploadResult, UseS3UploadOptions };
