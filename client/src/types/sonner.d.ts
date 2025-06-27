import SharedErrorType from '@/types/SharedErrorType';
declare module 'sonner' {
  export interface ToastOptions {
    description?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }

  export interface ToastPromiseOptions<T> {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: SharedErrorType) => string);
  }

  export const toast: {
    (message: string, options?: ToastOptions): void;
    success(message: string, options?: ToastOptions): void;
    error(message: string, options?: ToastOptions): void;
    warning(message: string, options?: ToastOptions): void;
    info(message: string, options?: ToastOptions): void;
    promise<T>(
      promise: Promise<T>,
      messages: ToastPromiseOptions<T>,
      options?: ToastOptions
    ): Promise<T>;
  };
}
