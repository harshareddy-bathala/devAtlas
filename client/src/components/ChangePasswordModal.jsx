import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Key, Mail, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { changePassword, sendResetEmail, isEmailProvider, auth } from '../lib/firebase';

// Password validation rules
const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /\d/.test(p) },
];

function PasswordStrengthIndicator({ password }) {
  const passedRules = passwordRules.filter(rule => rule.test(password));
  const strength = passedRules.length;
  
  const getStrengthColor = () => {
    if (strength <= 1) return 'bg-error';
    if (strength <= 2) return 'bg-warning';
    if (strength <= 3) return 'bg-amber-400';
    return 'bg-success';
  };

  const getStrengthLabel = () => {
    if (strength <= 1) return 'Weak';
    if (strength <= 2) return 'Fair';
    if (strength <= 3) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              level <= strength ? getStrengthColor() : 'bg-dark-600'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Password strength:</span>
        <span className={`font-medium ${
          strength <= 1 ? 'text-error' : 
          strength <= 2 ? 'text-warning' : 
          strength <= 3 ? 'text-amber-400' : 'text-success'
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      <ul className="space-y-1 mt-2">
        {passwordRules.map((rule) => (
          <li 
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              rule.test(password) ? 'text-success' : 'text-gray-500'
            }`}
          >
            {rule.test(password) ? (
              <Check className="w-3 h-3" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-gray-500" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangePasswordModal({ isOpen, onClose }) {
  const [method, setMethod] = useState('password'); // 'password' or 'email'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const isEmailUser = isEmailProvider();
  const userEmail = auth.currentUser?.email;

  const handleClose = () => {
    setMethod('password');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setEmailSent(false);
    onClose();
  };

  const validatePassword = () => {
    if (!currentPassword) {
      setError('Please enter your current password');
      return false;
    }
    
    if (!newPassword) {
      setError('Please enter a new password');
      return false;
    }

    // Check all password rules
    const failedRules = passwordRules.filter(rule => !rule.test(newPassword));
    if (failedRules.length > 0) {
      setError('Password does not meet all requirements');
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    setError('');
    
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      handleClose();
    } catch (err) {
      console.error('Change password error:', err);
      
      if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password')) {
        setError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/requires-recent-login') {
        setError('For security, please sign out and sign in again before changing your password.');
      } else {
        setError(err.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!userEmail) {
      setError('No email address found');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await sendResetEmail(userEmail);
      setEmailSent(true);
      toast.success('Password reset email sent!');
    } catch (err) {
      console.error('Send reset email error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="modal-content max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-dark-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-xl">
                <Key className="w-5 h-5 text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>
            <button
              onClick={handleClose}
              className="btn-icon"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Method Tabs - Only show for email users */}
            {isEmailUser && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setMethod('password')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    method === 'password'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600 border border-transparent'
                  }`}
                >
                  <Key className="w-4 h-4 inline mr-2" />
                  Use Password
                </button>
                <button
                  onClick={() => setMethod('email')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    method === 'email'
                      ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30'
                      : 'bg-dark-700 text-gray-400 hover:bg-dark-600 border border-transparent'
                  }`}
                >
                  <Mail className="w-4 h-4 inline mr-2" />
                  Via Email
                </button>
              </div>
            )}

            {/* Password Method */}
            {method === 'password' && isEmailUser && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="input-field pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="input-field pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Strength */}
                <PasswordStrengthIndicator password={newPassword} />

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`input-field pr-10 ${
                        confirmPassword && confirmPassword !== newPassword ? 'input-error' : ''
                      }`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-error mt-1">Passwords do not match</p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Email Method */}
            {method === 'email' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                {emailSent ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-success" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">Email Sent!</h3>
                    <p className="text-gray-400 text-sm">
                      We've sent a password reset link to:
                    </p>
                    <p className="text-primary-400 font-medium mt-1">{userEmail}</p>
                    <p className="text-gray-500 text-xs mt-4">
                      Check your inbox and follow the link to reset your password.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-dark-700/50 rounded-xl">
                      <p className="text-sm text-gray-300 mb-2">
                        We'll send a password reset link to:
                      </p>
                      <p className="text-primary-400 font-medium">{userEmail}</p>
                    </div>
                    <p className="text-sm text-gray-400">
                      Click the link in the email to create a new password. The link will expire after 1 hour.
                    </p>
                  </>
                )}
              </motion.div>
            )}

            {/* OAuth User Notice */}
            {!isEmailUser && (
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-warning mb-1">OAuth Account</h3>
                    <p className="text-sm text-gray-400">
                      Your account uses Google/GitHub sign-in. To change your password, please update it through your OAuth provider's settings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-dark-600">
            <button
              onClick={handleClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              {emailSent ? 'Close' : 'Cancel'}
            </button>
            
            {!emailSent && isEmailUser && (
              <button
                onClick={method === 'password' ? handleChangePassword : handleSendResetEmail}
                disabled={loading || (method === 'password' && (!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword))}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {method === 'password' ? 'Changing...' : 'Sending...'}
                  </>
                ) : method === 'password' ? (
                  'Change Password'
                ) : (
                  'Send Reset Email'
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ChangePasswordModal;
