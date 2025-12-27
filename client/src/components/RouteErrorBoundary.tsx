import React from 'react';
import { RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RouteErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Route-level Error Boundary
 * 
 * Provides isolated error handling for individual routes/pages.
 * Unlike the global ErrorBoundary, this allows users to navigate
 * away from the error without a full page refresh.
 */
class RouteErrorBoundaryClass extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route Error:', error, errorInfo);
    
    // You could log to your error tracking service here
    // e.g., Sentry.captureException(error, { extra: errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <RouteErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface RouteErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

/**
 * Default fallback UI for route errors
 */
function RouteErrorFallback({ error, onRetry }: RouteErrorFallbackProps) {
  // We need to use a wrapper to access useNavigate
  return <RouteErrorFallbackContent error={error} onRetry={onRetry} />;
}

function RouteErrorFallbackContent({ error, onRetry }: RouteErrorFallbackProps) {
  let navigate: ReturnType<typeof useNavigate> | null = null;
  
  try {
    // useNavigate may not be available if we're outside of Router context
    navigate = useNavigate();
  } catch {
    // Router not available, will use window.location instead
  }

  const handleGoBack = () => {
    if (navigate) {
      navigate(-1);
    } else {
      window.history.back();
    }
  };

  const handleGoHome = () => {
    if (navigate) {
      navigate('/dashboard');
    } else {
      window.location.href = '/dashboard';
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  const isChunkError = error?.message?.toLowerCase().includes('chunk') ||
    error?.message?.toLowerCase().includes('loading chunk');

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-xl font-semibold text-white mb-2">
          {isChunkError ? 'Update Available' : 'Page Error'}
        </h2>

        {/* Error Message */}
        <p className="text-light-400 mb-6">
          {isChunkError
            ? 'A new version is available. Please refresh to get the latest version.'
            : 'This page encountered an error. You can try again or navigate elsewhere.'}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isChunkError ? (
            <button
              onClick={handleReload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
          ) : (
            <>
              <button
                onClick={onRetry}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleGoBack}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors border border-dark-500"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
              <button
                onClick={handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-white font-medium rounded-lg transition-colors border border-dark-500"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </button>
            </>
          )}
        </div>

        {/* Debug Info (Development Only) */}
        {import.meta.env.MODE === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="text-light-500 text-sm cursor-pointer hover:text-light-400">
              Error Details
            </summary>
            <pre className="mt-2 p-4 bg-dark-800 rounded-lg text-xs text-red-400 overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * RouteErrorBoundary wrapper component
 * Provides route-level error isolation for lazy-loaded components
 */
export function RouteErrorBoundary({ children, fallback }: RouteErrorBoundaryProps) {
  return (
    <RouteErrorBoundaryClass fallback={fallback}>
      {children}
    </RouteErrorBoundaryClass>
  );
}

export default RouteErrorBoundary;
