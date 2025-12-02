import { Loader2 } from 'lucide-react';

// Loading spinner component
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

// Full page loading state
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-accent-purple" />
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Button with loading state
export function LoadingButton({ 
  loading, 
  children, 
  disabled, 
  className = '', 
  ...props 
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  );
}

// Skeleton loading components
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-dark-600 rounded ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
