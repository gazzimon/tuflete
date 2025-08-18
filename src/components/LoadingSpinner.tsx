interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  message = 'Cargando...', 
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className={`animate-spin border-4 border-primary-500 border-t-transparent rounded-full ${sizeClasses[size]}`}></div>
      {message && (
        <p className="text-lg font-medium text-slate-600 dark:text-slate-300 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
