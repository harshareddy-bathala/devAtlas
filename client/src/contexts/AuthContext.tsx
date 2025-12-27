import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { 
  auth, 
  signIn as firebaseSignIn, 
  signUp as firebaseSignUp, 
  signOut as firebaseSignOut,
  signInWithGoogle,
  signInWithGitHub,
  onAuthChange 
} from '../lib/firebase';
import { clearTokenCache } from '../utils/api';
import api from '../utils/api';

interface UserProfile {
  displayName?: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
}

interface User {
  id: string;
  email: string | null;
  name: string;
  avatarUrl?: string | null;
  bio?: string;
  profile?: UserProfile;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

// Stub function for user identification (analytics placeholder)
const identifyUser = (userId: string) => {
  if (import.meta.env.MODE === 'development') {
    console.log('User identified:', userId);
  }
};

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const loadingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Function to refresh user profile from API
  const refreshUserProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    
    setProfileLoading(true);
    try {
      const profile = await api.getProfile();
      if (profile) {
        setUser(prev => prev ? {
          ...prev,
          name: profile.displayName || profile.name || prev.name,
          avatarUrl: profile.avatarUrl || prev.avatarUrl,
          bio: profile.bio,
          profile
        } : null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safety timeout to prevent infinite loading
    loadingTimeout.current = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached, stopping loader');
        setIsLoading(false);
      }
    }, 3000);
    
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser: FirebaseUser | null) => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      if (firebaseUser) {
        try {
          await firebaseUser.getIdToken(true);
        } catch (error) {
          console.error('Failed to refresh token on auth change:', error);
        }
        
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '',
          avatarUrl: firebaseUser.photoURL
        });
        
        identifyUser(firebaseUser.uid);
        setIsLoading(false);
        setTimeout(() => refreshUserProfile(), 100);
      } else {
        setUser(null);
        clearTokenCache();
        setIsLoading(false);
      }
    });

    return () => {
      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
      }
      unsubscribe();
    };
  }, [refreshUserProfile]);

  const signIn = async (email: string, password: string) => {
    await firebaseSignIn(email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    await firebaseSignUp(email, password, name);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      clearTokenCache();
      await firebaseSignOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogleProvider = async () => {
    await signInWithGoogle();
  };

  const signInWithGitHubProvider = async () => {
    await signInWithGitHub();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        profileLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        signInWithGoogle: signInWithGoogleProvider,
        signInWithGitHub: signInWithGitHubProvider,
        refreshUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
