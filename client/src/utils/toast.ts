import { toast as toastify, ToastOptions } from 'react-toastify';
type ToastType = 'success' | 'error' | 'info' | 'warning';
export const showToast = (message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
    const toastOptions: ToastOptions = {
        position: 'top-right',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        ...options,
    };
    switch (type) {
        case 'success':
            toastify.success(message, toastOptions);
            break;
        case 'error':
            toastify.error(message, toastOptions);
            break;
        case 'warning':
            toastify.warning(message, toastOptions);
            break;
        case 'info':
        default:
            toastify.info(message, toastOptions);
            break;
    }
};
export const dismissToast = (toastId?: string | number) => {
    if (toastId) {
        toastify.dismiss(toastId);
    }
    else {
        toastify.dismiss();
    }
};
// Export toast object for direct usage if needed
export const toast = {
    success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
    error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
    info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
    warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
    dismiss: dismissToast,
};
