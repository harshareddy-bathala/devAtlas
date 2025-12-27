import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft, WifiOff, Server, Bug, LucideIcon } from 'lucide-react';

type ErrorType = 'network' | 'chunk' | 'auth' | 'timeout' | 'code' | 'unknown';
type ActionType = 'retry' | 'refresh' | 'home' | 'back';

interface ErrorConfig {
  icon: LucideIcon;
  title: string;
  message: string;
  suggestions: string[];
  actions: ActionType[];
}

// Error type detection
function getErrorType(error: Error | null): ErrorType {
  if (!error) return 'unknown';
  
  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('chunk') || message.includes('loading chunk')) {
    return 'chunk';
  }
  if (message.includes('firebase') || message.includes('auth')) {
    return 'auth';
  }
  if (message.includes('timeout')) {
    return 'timeout';
  }
  if (name.includes('syntaxerror') || name.includes('typeerror')) {
    return 'code';
  }
  
  return 'unknown';
}

// Error-specific recovery suggestions
const ERROR_CONFIGS: Record<ErrorType, ErrorConfig> = {
  network: {
    icon: WifiOff,
    title: 'Connection Issue',
    message: 'Unable to connect to the server. Please check your internet connection.',
    suggestions: [
      'Check your internet connection',
      'Try disabling VPN if you\'re using one',
      'Wait a moment and try again'
    ],
    actions: ['retry', 'refresh']
  },
  chunk: {
    icon: RefreshCw,
    title: 'Update Available',
    message: 'A new version of the app is available. Please refresh to get the latest version.',
    suggestions: [
      'This usually happens after an app update',
      'Refreshing will load the latest version'
    ],
    actions: ['refresh']
  },
  auth: {
    icon: Server,
    title: 'Authentication Error',
    message: 'There was a problem with your session. Please try signing in again.',
    suggestions: [
      'Your session may have expired',
      'Try signing out and back in'
    ],
    actions: ['home', 'refresh']
  },
  timeout: {
    icon: Server,
    title: 'Request Timeout',
    message: 'The server is taking too long to respond. Please try again.',
    suggestions: [
      'The server might be busy',
      'Try again in a few moments'
    ],
    actions: ['retry', 'refresh']
  },
  code: {
    icon: Bug,
    title: 'Application Error',
    message: 'Something went wrong in the application.',
    suggestions: [
      'This is likely a bug we need to fix',
      'Refreshing might help'
    ],
    actions: ['refresh', 'home']
  },
  unknown: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try refreshing the page.',
    suggestions: [
      'This might be a temporary issue',
      'If the problem persists, please contact support'
    ],
    actions: ['refresh', 'home']
  }
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, errorType: getErrorType(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo, errorType: getErrorType(error) });
    
    // Log error to console in development
    if (import.meta.env.MODE === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // TODO: Send to error tracking service (Sentry)
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  handleGoBack = (): void => {
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const config = ERROR_CONFIGS[this.state.errorType] || ERROR_CONFIGS.unknown;
      const Icon = config.icon;

      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-xl font-bold mb-2">{config.title}</h1>
            <p className="text-gray-400 mb-4">{config.message}</p>
            
            {/* Suggestions */}
            {config.suggestions.length > 0 && (
              <div className="bg-dark-700 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-300 font-medium mb-2">Try these:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  {config.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-accent-blue">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Development error details */}
            {import.meta.env.MODE === 'development' && this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Technical Details
                </summary>
                <pre className="text-xs bg-dark-700 p-4 rounded-lg mt-2 overflow-auto max-h-40 text-red-400">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 justify-center">
              {config.actions.includes('retry') && (
                <button 
                  onClick={this.handleRetry}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              )}
              
              {config.actions.includes('refresh') && (
                <button 
                  onClick={this.handleRefresh}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Page
                </button>
              )}
              
              {config.actions.includes('home') && (
                <button 
                  onClick={this.handleGoHome}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              )}
              
              {config.actions.includes('back') && (
                <button 
                  onClick={this.handleGoBack}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Go Back
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
