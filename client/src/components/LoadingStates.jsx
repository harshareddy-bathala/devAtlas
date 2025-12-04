import { Loader2 } from 'lucide-react';

// Loading spinner component
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  
  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

// Full page loading state
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <Spinner size="xl" className="mx-auto mb-4 text-primary-500" />
        <p className="text-gray-400">{message}</p>
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
  loadingText,
  ...props 
}) {
  return (
    <button
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'opacity-80 cursor-not-allowed' : ''}`}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <Spinner size="sm" />
          {loadingText && <span className="text-sm">{loadingText}</span>}
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  );
}

// Base Skeleton component
export function Skeleton({ className = '' }) {
  return (
    <div className={`bg-dark-600 rounded animate-pulse ${className}`} />
  );
}

// Card skeleton
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
      </div>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${100 - i * 15}%` }} />
      ))}
    </div>
  );
}

// Stat card skeleton
export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-11 h-11 rounded-xl" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-dark-600">
      {[...Array(columns)].map((_, i) => (
        <Skeleton 
          key={i} 
          className="h-4" 
          style={{ width: i === 0 ? '40%' : `${20}%` }} 
        />
      ))}
    </div>
  );
}

// List skeleton
export function ListSkeleton({ items = 5, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-dark-700/50 rounded-lg"
        >
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="w-16 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 256 }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div 
        className="bg-dark-700/50 rounded-lg flex items-end justify-around p-4"
        style={{ height }}
      >
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="w-6 bg-dark-600 rounded-t" 
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Avatar skeleton
export function AvatarSkeleton({ size = 'md' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };
  
  return <Skeleton className={`${sizes[size]} rounded-full`} />;
}

// Form skeleton
export function FormSkeleton({ fields = 3 }) {
  return (
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg mt-6" />
    </div>
  );
}

// Grid skeleton
export function GridSkeleton({ items = 6, columns = 3 }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {[...Array(items)].map((_, i) => (
        <CardSkeleton key={i} lines={2} />
      ))}
    </div>
  );
}

// Inline loading indicator
export function InlineLoader({ text = 'Loading' }) {
  return (
    <span className="inline-flex items-center gap-2 text-gray-400">
      <Spinner size="sm" />
      <span>{text}</span>
    </span>
  );
}

// Overlay loader (for modals, cards that are updating)
export function OverlayLoader({ message }) {
  return (
    <div className="absolute inset-0 bg-dark-900/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-2 text-primary-500" />
        {message && <p className="text-sm text-gray-400">{message}</p>}
      </div>
    </div>
  );
}
