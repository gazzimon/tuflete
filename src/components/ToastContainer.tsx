import { useEffect } from 'react';
import type { Toast } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  onRemoveToast: (id: string) => void;
}

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const typeStyles = {
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
  };

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  return (
    <div
      className={`
        flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm
        transition-all duration-300 transform hover:scale-105
        ${typeStyles[toast.type]}
        animate-slide-up
      `}
    >
      <span className="text-xl">{icons[toast.type]}</span>
      <p className="flex-1 font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-lg hover:scale-110 transition-transform"
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
    </div>
  );
};

export default function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast} 
          onRemove={onRemoveToast} 
        />
      ))}
    </div>
  );
}
