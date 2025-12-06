// Type declarations for AuthContext.jsx

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio?: string;
  profile?: Record<string, unknown>;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  profileLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element;
export function useAuth(): AuthContextType;
