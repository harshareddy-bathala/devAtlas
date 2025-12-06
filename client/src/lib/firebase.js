import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
  deleteUser,
  unlink
} from 'firebase/auth';

// Firebase configuration from environment variables with fallbacks
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// Validate config - only warn in development
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;
if (!isConfigValid) {
  if (import.meta.env.DEV) {
    console.warn('Firebase configuration is incomplete. Check your .env file.');
  }
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Sign in with email/password
export async function signIn(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

// Sign up with email/password
export async function signUp(email, password, name) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
}

// Sign out
export async function signOut() {
  await firebaseSignOut(auth);
}

// Sign in with Google
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Sign in with GitHub
export async function signInWithGitHub() {
  const result = await signInWithPopup(auth, githubProvider);
  return result.user;
}

// Get current user's ID token
export async function getIdToken(forceRefresh = false) {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  
  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
}

// Subscribe to auth state changes
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Re-authenticate user with password (required before sensitive operations)
export async function reauthenticate(password) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No authenticated user found');
  }
  
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
  return true;
}

// Change password
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  // First re-authenticate
  await reauthenticate(currentPassword);
  
  // Then update password
  await updatePassword(user, newPassword);
  return true;
}

// Send password reset email
export async function sendResetEmail(email) {
  await sendPasswordResetEmail(auth, email);
  return true;
}

// Delete user account
export async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  // For email users, re-authenticate with password
  if (isEmailProvider() && password) {
    await reauthenticate(password);
  }
  
  // Delete the user
  await deleteUser(user);
  return true;
}

// Re-authenticate OAuth user with popup
export async function reauthenticateWithProvider(providerId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  let provider;
  if (providerId === 'google.com') {
    provider = new GoogleAuthProvider();
  } else if (providerId === 'github.com') {
    provider = new GithubAuthProvider();
  } else {
    throw new Error('Unsupported provider');
  }
  
  await reauthenticateWithPopup(user, provider);
  return true;
}

// Link GitHub account to existing user
export async function linkGitHubAccount() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  const provider = new GithubAuthProvider();
  // Only request access to repos - no user profile data
  provider.addScope('public_repo');
  
  const result = await linkWithPopup(user, provider);
  const credential = GithubAuthProvider.credentialFromResult(result);
  return {
    user: result.user,
    accessToken: credential?.accessToken
  };
}

// Unlink provider from account
export async function unlinkProvider(providerId) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }
  
  await unlink(user, providerId);
  return true;
}

// Get user's linked providers
export function getLinkedProviders() {
  const user = auth.currentUser;
  if (!user) return [];
  return user.providerData.map(p => p.providerId);
}

// Check if user signed in with email/password (vs OAuth)
export function isEmailProvider() {
  const user = auth.currentUser;
  if (!user) return false;
  
  return user.providerData.some(
    provider => provider.providerId === 'password'
  );
}

export default app;
