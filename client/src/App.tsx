import { lazy, Suspense, useEffect } from 'react';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { UndoProvider } from './contexts/UndoContext';
import { GoalsProvider } from './contexts/GoalsContext';
import { CustomCategoriesProvider } from './contexts/CustomCategoriesContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { CollaborationProvider } from './contexts/CollaborationContext';
import ErrorBoundary from './components/ErrorBoundary';
import { RouteErrorBoundary } from './components/RouteErrorBoundary';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';

// Lazy load page components for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StackTracker = lazy(() => import('./pages/StackTracker'));
const Projects = lazy(() => import('./pages/Projects'));
const Resources = lazy(() => import('./pages/Resources'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const LoginPage = lazy(() => import('./pages/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Explore = lazy(() => import('./pages/Explore'));

// Page loader component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
    </div>
  );
}

// Full page loader for auth checks with timeout safety
function FullPageLoader() {
  const [showTimeout, setShowTimeout] = React.useState(false);

  useEffect(() => {
    // Show timeout message after 5 seconds
    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-900">
      <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      {showTimeout && (
        <div className="mt-4 text-center">
          <p className="text-light-400 text-sm mb-2">Taking longer than expected...</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="text-accent-primary hover:text-accent-primary-hover text-sm underline"
          >
            Go to login
          </button>
        </div>
      )}
    </div>
  );
}

// Protected Route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isOnboarded, isChecking } = useOnboarding();

  if (isLoading || isChecking) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if not completed
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Onboarding Route - only accessible if logged in but not onboarded
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isOnboarded, isChecking } = useOnboarding();

  if (isLoading || isChecking) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If already onboarded, go to dashboard
  if (isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public Route wrapper (redirect to appropriate page if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { isOnboarded, isChecking } = useOnboarding();

  if (isLoading || isChecking) {
    return <FullPageLoader />;
  }

  if (user) {
    // Redirect to onboarding if not completed, otherwise dashboard
    if (!isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Landing page route - shows landing for unauthenticated, redirects authenticated users
function LandingRoute() {
  const { user, isLoading } = useAuth();
  const { isOnboarded, isChecking } = useOnboarding();

  if (isLoading || isChecking) {
    return <FullPageLoader />;
  }

  if (user) {
    // Redirect to onboarding if not completed, otherwise dashboard
    if (!isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}

// Scroll to top on route change and clear browser navigation cache
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Clear browser's scroll restoration to prevent state persistence
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, [pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Landing page - public facing */}
        <Route path="/" element={<RouteErrorBoundary><LandingRoute /></RouteErrorBoundary>} />

        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <RouteErrorBoundary>
                <LoginPage />
              </RouteErrorBoundary>
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <RouteErrorBoundary>
                <ForgotPasswordPage />
              </RouteErrorBoundary>
            </PublicRoute>
          }
        />

        {/* Onboarding route */}
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <RouteErrorBoundary>
                <Onboarding />
              </RouteErrorBoundary>
            </OnboardingRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Dashboard />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Explore />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/stack"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <StackTracker />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Projects />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resources"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Resources />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Settings />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <Profile />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={<Navigate to="/settings" replace />}
        />

        {/* Catch all - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </>
  );
}

export default function App() {
  // Disable browser's scroll restoration globally
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <OnboardingProvider>
            <ConnectionProvider>
              <UndoProvider>
                <GoalsProvider>
                  <CustomCategoriesProvider>
                    <NotificationsProvider>
                      <CollaborationProvider>
                        <BrowserRouter
                          future={{
                            v7_startTransition: true,
                            v7_relativeSplatPath: true,
                          }}
                        >
                          <AppRoutes />
                          <Toaster
                            position="bottom-right"
                            toastOptions={{
                              duration: 4000,
                              style: {
                                background: '#18181B',
                                color: '#FAFAFA',
                                border: '1px solid #27272A',
                              },
                              success: {
                                iconTheme: {
                                  primary: '#22C55E',
                                  secondary: '#FAFAFA',
                                },
                              },
                              error: {
                                iconTheme: {
                                  primary: '#EF4444',
                                  secondary: '#FAFAFA',
                                },
                              },
                            }}
                          />
                        </BrowserRouter>
                      </CollaborationProvider>
                    </NotificationsProvider>
                  </CustomCategoriesProvider>
                </GoalsProvider>
              </UndoProvider>
            </ConnectionProvider>
          </OnboardingProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}