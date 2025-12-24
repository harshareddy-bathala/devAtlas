import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../utils/api';

interface OnboardingContextType {
  isOnboarded: boolean;
  isChecking: boolean;
  refreshOnboardingStatus: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const lastUserId = useRef<string | null>(null);
  const checkInProgress = useRef(false);

  const checkOnboardingStatus = async (userId: string) => {
    // Prevent duplicate checks
    if (checkInProgress.current) return;
    checkInProgress.current = true;
    
    // Set a timeout to prevent infinite loading (reduced to 5 seconds)
    const timeout = setTimeout(() => {
      if (lastUserId.current === userId && checkInProgress.current) {
        console.warn('Onboarding check timed out, assuming onboarded');
        setIsOnboarded(true);
        setIsChecking(false);
        checkInProgress.current = false;
      }
    }, 5000); // 5 second timeout
    
    try {
      const profile = await api.getProfile();
      clearTimeout(timeout);
      // Only update if this is still the current user
      if (lastUserId.current === userId) {
        setIsOnboarded(profile.isOnboarded === true);
      }
    } catch (error: any) {
      clearTimeout(timeout);
      // Only mark as not onboarded on explicit 404 (user doesn't exist)
      // For network/CORS errors, assume onboarded to prevent blocking
      if (lastUserId.current === userId) {
        if (error?.code === 'NOT_FOUND' || error?.status === 404) {
          setIsOnboarded(false);
        } else {
          // On error, assume onboarded to not block the user
          console.error('Onboarding check failed, assuming onboarded:', error);
          setIsOnboarded(true);
        }
      }
    } finally {
      if (lastUserId.current === userId) {
        setIsChecking(false);
      }
      checkInProgress.current = false;
    }
  };

  useEffect(() => {
    // Always keep checking true while auth is loading
    if (authLoading) {
      setIsChecking(true);
      return;
    }

    if (user) {
      // Only check if user changed
      if (lastUserId.current !== user.id) {
        lastUserId.current = user.id;
        setIsChecking(true);
        checkOnboardingStatus(user.id);
      }
    } else {
      lastUserId.current = null;
      setIsOnboarded(false);
      setIsChecking(false);
    }
  }, [user, authLoading]);

  const refreshOnboardingStatus = async () => {
    if (!user) return;
    setIsChecking(true);
    checkInProgress.current = false; // Allow refresh
    await checkOnboardingStatus(user.id);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarded,
        isChecking,
        refreshOnboardingStatus
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
