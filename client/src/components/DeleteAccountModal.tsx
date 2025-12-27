import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isEmailProvider, reauthenticateWithProvider, getLinkedProviders, signOut } from '../lib/firebase';
import api from '../utils/api';
import Modal from './common/Modal';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthProvider = 'google.com' | 'github.com' | string;

interface AuthError extends Error {
  code?: string;
}

function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState<string>('');
  const [confirmText, setConfirmText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const isEmailUser = isEmailProvider();
  const providers = getLinkedProviders() as AuthProvider[];
  const oauthProvider = providers.find((p: AuthProvider) => p === 'google.com' || p === 'github.com');

  const handleClose = (): void => {
    setStep(1);
    setPassword('');
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleContinue = (): void => {
    if (step === 1) {
      setStep(2);
    }
  };

  const handleDeleteAccount = async (): Promise<void> => {
    setError('');
    
    // Validate confirm text
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    // For email users, validate password
    if (isEmailUser && !password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      // For OAuth users, re-authenticate first
      if (!isEmailUser && oauthProvider) {
        try {
          await reauthenticateWithProvider(oauthProvider);
        } catch (reAuthErr) {
          const authError = reAuthErr as AuthError;
          if (authError.code === 'auth/popup-closed-by-user') {
            setError('Authentication cancelled. Please try again.');
            setLoading(false);
            return;
          }
          throw reAuthErr;
        }
      }
      
      // Call server endpoint to delete all data AND Firebase auth account
      await api.deleteAccount(password);
      
      // Sign out locally (the auth account is already deleted server-side)
      await signOut();
      
      toast.success('Account deleted successfully');
      handleClose();
      // The auth state change will automatically redirect to login
    } catch (err) {
      console.error('Delete account error:', err);
      const authError = err as AuthError;
      
      // Handle specific errors
      if (authError.code === 'auth/wrong-password' || authError.message?.includes('wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (authError.code === 'auth/requires-recent-login' || authError.message?.includes('recent-login')) {
        setError('For security, please sign out and sign in again before deleting your account.');
      } else if (authError.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups and try again.');
      } else {
        setError(authError.message || 'Failed to delete account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Custom header for delete account modal
  const modalHeader = (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-error/10 rounded-lg">
        <Trash2 className="w-5 h-5 text-error" />
      </div>
      <h2 className="text-lg font-semibold">Delete Account</h2>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      showCloseButton={false}
      closeOnOutsideClick={!loading}
      closeOnEscape={!loading}
    >
      {modalHeader}

      {/* Content */}
      <div className="mb-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-error text-sm mb-1">This action is permanent</h3>
                    <p className="text-xs text-gray-400">
                      All your data will be permanently deleted:
                    </p>
                  </div>
                </div>
              </div>

              <ul className="space-y-1.5 text-sm text-gray-300 ml-1">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-error rounded-full" />
                  All tracked skills and learning progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-error rounded-full" />
                  All projects and their details
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-error rounded-full" />
                  All saved resources and bookmarks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-error rounded-full" />
                  Your complete activity history
                </li>
              </ul>

              <p className="text-xs text-gray-500">
                This action cannot be undone. Export your data first if needed.
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <p className="text-sm text-gray-300">
                To confirm deletion, please complete the following:
              </p>

              {/* Password field for email users */}
              {isEmailUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">
                    Enter your password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your current password"
                    className="input-field"
                    autoComplete="current-password"
                  />
                </div>
              )}

              {/* OAuth user notice */}
              {!isEmailUser && oauthProvider && (
                <div className="p-3 bg-dark-700/50 rounded-lg text-sm text-gray-400">
                  You'll be asked to re-authenticate with {oauthProvider === 'google.com' ? 'Google' : 'GitHub'} to confirm.
                </div>
              )}

              {/* Confirm text field */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Type <span className="text-error font-mono">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className={`input-field font-mono ${confirmText && confirmText !== 'DELETE' ? 'border-error/50' : ''}`}
                  autoComplete="off"
                />
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 bg-error/10 border border-error/20 rounded-lg text-sm text-error"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex gap-3 pt-4 border-t border-dark-600">
        <button
          onClick={handleClose}
          className="btn-secondary flex-1"
          disabled={loading}
        >
          Cancel
        </button>
        
        {step === 1 ? (
          <button
            onClick={handleContinue}
            className="flex-1 px-4 py-2 rounded-lg font-medium bg-error/20 text-error hover:bg-error/30 transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleDeleteAccount}
            disabled={loading || confirmText !== 'DELETE' || (isEmailUser && !password)}
            className="flex-1 px-4 py-2 rounded-lg font-medium bg-error text-white hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Account
              </>
            )}
          </button>
        )}
      </div>
    </Modal>
  );
}

export default DeleteAccountModal;
