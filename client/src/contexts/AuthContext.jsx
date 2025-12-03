import { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  signIn as firebaseSignIn, 
  signUp as firebaseSignUp, 
  signOut as firebaseSignOut,
  signInWithGoogle,
  signInWithGitHub,
  onAuthChange 
} from '../lib/firebase';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get user profile from our backend
          const profile = await api.getMe();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: profile.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            avatarUrl: profile.avatarUrl || firebaseUser.photoURL
          });
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Use Firebase user data as fallback
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            avatarUrl: firebaseUser.photoURL
          });
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      await firebaseSignIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email, password, name) => {
    setIsLoading(true);
    try {
      await firebaseSignUp(email, password, name);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogleProvider = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGitHubProvider = async () => {
    setIsLoading(true);
    try {
      await signInWithGitHub();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        signInWithGoogle: signInWithGoogleProvider,
        signInWithGitHub: signInWithGitHubProvider
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
