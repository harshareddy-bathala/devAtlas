import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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
          profile // Store full profile for reference
        } : null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Force a fresh token to ensure it's valid
        try {
          await firebaseUser.getIdToken(true);
        } catch (error) {
          console.error('Failed to refresh token on auth change:', error);
        }
        
        // Set initial user from Firebase
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || '', // Don't use email fallback - wait for profile
          avatarUrl: firebaseUser.photoURL
        });
        
        // Then fetch profile data from Firestore
        setIsLoading(false);
        // Fetch profile after auth is confirmed
        setTimeout(() => refreshUserProfile(), 100);
      } else {
        setUser(null);
        // Clear token cache when user logs out
        clearTokenCache();
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [refreshUserProfile]);

  const signIn = async (email, password) => {
    // Don't set isLoading here - let onAuthChange handle loading state
    // This prevents race conditions that cause page flashing
    await firebaseSignIn(email, password);
  };

  const signUp = async (email, password, name) => {
    await firebaseSignUp(email, password, name);
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      // Clear token cache before signing out
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
