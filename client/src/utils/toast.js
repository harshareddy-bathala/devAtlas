/**
 * Toast Utilities with Retry Support
 * 
 * Provides toast notifications with built-in retry functionality for recoverable errors.
 */

import toast from 'react-hot-toast';
import { RefreshCw, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';
import { createElement } from 'react';

/**
 * Show an error toast with optional retry button
 */
export function showErrorToast(error, options = {}) {
  const { onRetry, retryLabel = 'Retry' } = options;
  
  // Check if error has a retry function attached
  const retryFn = onRetry || error?.retryFn;
  const isRetryable = error?.retryable || !!retryFn;
  
  // Get appropriate icon
  const isNetworkError = error?.code === 'NETWORK_ERROR';
  const IconComponent = isNetworkError ? WifiOff : AlertCircle;
  
  if (isRetryable && retryFn) {
    // Show toast with retry button
    toast.custom((t) => (
      createElement('div', {
        className: `${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-dark-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-dark-500`,
      }, [
        createElement('div', { className: 'flex-1 w-0 p-4', key: 'content' }, [
          createElement('div', { className: 'flex items-start', key: 'inner' }, [
            createElement('div', { className: 'flex-shrink-0 pt-0.5', key: 'icon' },
              createElement(IconComponent, { className: 'h-5 w-5 text-red-400' })
            ),
            createElement('div', { className: 'ml-3 flex-1', key: 'text' }, [
              createElement('p', { className: 'text-sm font-medium text-white', key: 'message' },
                error?.message || 'An error occurred'
              ),
              isNetworkError && createElement('p', { className: 'mt-1 text-xs text-gray-400', key: 'hint' },
                'Check your internet connection'
              )
            ])
          ])
        ]),
        createElement('div', { className: 'flex border-l border-dark-500', key: 'actions' },
          createElement('button', {
            onClick: async () => {
              toast.dismiss(t.id);
              try {
                await retryFn();
                toast.success('Success!');
              } catch (retryError) {
                showErrorToast(retryError, { onRetry: retryFn });
              }
            },
            className: 'w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-accent-blue hover:text-accent-blue/80 focus:outline-none'
          }, [
            createElement(RefreshCw, { className: 'w-4 h-4 mr-1.5', key: 'retry-icon' }),
            retryLabel
          ])
        )
      ])
    ), { duration: 8000 });
  } else {
    // Show regular error toast
    toast.error(error?.message || 'An error occurred');
  }
}

/**
 * Show a success toast
 */
export function showSuccessToast(message, options = {}) {
  toast.success(message, options);
}

/**
 * Show a loading toast that can be updated
 */
export function showLoadingToast(message) {
  return toast.loading(message);
}

/**
 * Update a loading toast to success
 */
export function updateToastSuccess(toastId, message) {
  toast.success(message, { id: toastId });
}

/**
 * Update a loading toast to error
 */
export function updateToastError(toastId, error, options = {}) {
  toast.dismiss(toastId);
  showErrorToast(error, options);
}

/**
 * Wrap an async operation with loading/success/error toasts
 */
export async function withToast(operation, messages = {}) {
  const {
    loading = 'Loading...',
    success = 'Success!',
    error = 'An error occurred'
  } = messages;
  
  const toastId = toast.loading(loading);
  
  try {
    const result = await operation();
    toast.success(success, { id: toastId });
    return result;
  } catch (err) {
    toast.dismiss(toastId);
    showErrorToast(err.message ? err : { message: error, ...err });
    throw err;
  }
}

export default {
  error: showErrorToast,
  success: showSuccessToast,
  loading: showLoadingToast,
  updateSuccess: updateToastSuccess,
  updateError: updateToastError,
  withToast
};
