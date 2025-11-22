"use client";
import { useEffect, useState } from 'react';
export interface ToastState {
  message: string;
  visible: boolean;
  type?: 'success' | 'error' | 'warning' | 'info';
}

interface ToastNotificationProps {
  toast: ToastState;
  onHide: () => void;
  autoHideDelay?: number;
}

export function ToastNotification({
  toast,
  onHide,
  autoHideDelay = 3000
}: ToastNotificationProps) {
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        onHide();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast.visible, onHide, autoHideDelay]);

  if (!toast.visible) {return null;}

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 max-w-md";

    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-green-500 text-white`;
      case 'error':
        return `${baseStyles} bg-red-500 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-black`;
      case 'info':
        return `${baseStyles} bg-blue-500 text-white`;
      default:
        return `${baseStyles} bg-gray-800 text-white`;
    }
  };

  return (
    <div
      className={getToastStyles()}
      onClick={onHide}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={onHide}
          className="ml-4 text-white hover:text-gray-200 transition-colors"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    visible: false,
    type: 'info'
  });

  const showToast = (message: string, type: ToastState['type'] = 'info') => {
    setToast({
      message,
      visible: true,
      type
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return {
    toast,
    showToast,
    hideToast
  };
}