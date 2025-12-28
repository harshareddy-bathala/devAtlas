import { useState } from 'react';
import toast from 'react-hot-toast';
import { 
  Trash2, 
  Mail,
  Key,
  Shield,
  Github,
  Check,
  Loader2,
  Link as LinkIcon,
  Unlink,
  Globe,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { isEmailProvider, getLinkedProviders, linkGitHubAccount, unlinkProvider } from '../lib/firebase';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { PublicProfileSettings } from '../components/CollaborationPanel';

interface FirebaseAuthError extends Error {
  code?: string;
}

function Settings(): JSX.Element {
  const { user } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);
  
  // GitHub linking state
  const [linkingGithub, setLinkingGithub] = useState<boolean>(false);
  const [unlinkingGithub, setUnlinkingGithub] = useState<boolean>(false);
  
  const isEmailUser = isEmailProvider();
  const linkedProviders = getLinkedProviders();
  const hasGithubLinked = linkedProviders.includes('github.com');
  const hasGoogleLinked = linkedProviders.includes('google.com');

  const handleLinkGitHub = async (): Promise<void> => {
    setLinkingGithub(true);
    try {
      await linkGitHubAccount();
      toast.success('GitHub account linked successfully!');
      window.location.reload(); // Refresh to update provider list
    } catch (error) {
      console.error('GitHub link error:', error);
      const authError = error as FirebaseAuthError;
      // User cancelled or closed popup
      if (authError.code === 'auth/popup-closed-by-user' || authError.code === 'auth/user-cancelled') {
        toast.error('GitHub linking was cancelled');
      } else if (authError.code === 'auth/credential-already-in-use') {
        toast.error('This GitHub account is already linked to another user');
      } else if (authError.code === 'auth/popup-blocked') {
        toast.error('Popup blocked. Please allow popups and try again.');
      } else {
        toast.error('Failed to link GitHub account. Please try again.');
      }
    } finally {
      setLinkingGithub(false);
    }
  };

  const handleUnlinkGitHub = async (): Promise<void> => {
    if (linkedProviders.length <= 1) {
      toast.error('Cannot unlink - you need at least one sign-in method');
      return;
    }

    setUnlinkingGithub(true);
    try {
      await unlinkProvider('github.com');
      toast.success('GitHub account unlinked');
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink GitHub';
      toast.error(errorMessage);
    } finally {
      setUnlinkingGithub(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">Settings</h1>
        <p className="text-light-500">Manage your account preferences and integrations</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Appearance Section */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              {resolvedTheme === 'dark' ? <Moon className="w-5 h-5 text-accent-primary" /> : <Sun className="w-5 h-5 text-accent-primary" />}
            </div>
            <div>
              <h2 className="font-semibold text-white">Appearance</h2>
              <p className="text-xs text-light-500">Customize how DevOrbit looks</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-light-400 mb-3">Select your preferred theme</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('LIGHT')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  theme === 'LIGHT' 
                    ? 'border-accent-primary bg-accent-primary/10' 
                    : 'border-dark-600 hover:border-dark-500 bg-dark-700'
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs">Light</span>
              </button>
              <button
                onClick={() => setTheme('DARK')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  theme === 'DARK' 
                    ? 'border-accent-primary bg-accent-primary/10' 
                    : 'border-dark-600 hover:border-dark-500 bg-dark-700'
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs">Dark</span>
              </button>
              <button
                onClick={() => setTheme('SYSTEM')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  theme === 'SYSTEM' 
                    ? 'border-accent-primary bg-accent-primary/10' 
                    : 'border-dark-600 hover:border-dark-500 bg-dark-700'
                }`}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-xs">System</span>
              </button>
            </div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Connected Accounts</h2>
              <p className="text-xs text-light-500">Manage linked services</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* GitHub */}
            <div className="flex items-center justify-between p-4 bg-dark-700 border border-dark-600 rounded-lg">
              <div className="flex items-center gap-3">
                <Github className="w-6 h-6 text-white" />
                <div>
                  <p className="text-sm font-medium text-white">GitHub</p>
                  <p className="text-xs text-light-500">
                    {hasGithubLinked ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              
              {hasGithubLinked ? (
                <button
                  onClick={handleUnlinkGitHub}
                  disabled={unlinkingGithub || linkedProviders.length <= 1}
                  className="text-xs px-4 py-2 rounded-lg bg-dark-600 text-light-400 hover:text-white hover:bg-dark-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {unlinkingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                  Unlink
                </button>
              ) : (
                <button
                  onClick={handleLinkGitHub}
                  disabled={linkingGithub}
                  className="text-xs px-4 py-2 rounded-lg bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {linkingGithub ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  Connect
                </button>
              )}
            </div>

            {/* Google */}
            {hasGoogleLinked && (
              <div className="flex items-center justify-between p-4 bg-dark-700 border border-dark-600 rounded-lg">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-white">Google</p>
                    <p className="text-xs text-light-500">Connected</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
                  <Check className="w-4 h-4" />
                  Linked
                </div>
              </div>
            )}

            {/* Email */}
            <div className="flex items-center justify-between p-4 bg-dark-700 border border-dark-600 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-6 h-6 text-light-500" />
                <div>
                  <p className="text-sm font-medium text-white">Email</p>
                  <p className="text-xs text-light-500">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
                <Check className="w-4 h-4" />
                Primary
              </div>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Account Security</h2>
              <p className="text-xs text-light-500">Manage your password and security</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-dark-700 border border-dark-600 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-light-400" />
                <div>
                  <p className="text-sm font-medium text-white">Password</p>
                  <p className="text-xs text-light-500">
                    {isEmailUser ? 'Change your account password' : 'Managed by OAuth provider'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setChangePasswordModalOpen(true)}
                className="text-xs px-4 py-2 rounded-lg bg-dark-600 text-light-300 hover:text-white hover:bg-dark-500 transition-colors"
              >
                {isEmailUser ? 'Change' : 'View'}
              </button>
            </div>
          </div>
        </div>

        {/* Public Profile / Sharing */}
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Public Profile</h2>
              <p className="text-xs text-light-500">Share your progress with others</p>
            </div>
          </div>
          <PublicProfileSettings />
        </div>
      </div>

      {/* Danger Zone - Full Width */}
      <div className="bg-dark-800 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="font-semibold text-red-400">Danger Zone</h2>
            <p className="text-xs text-light-500">Irreversible account actions</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">Delete Account</p>
            <p className="text-xs text-light-500">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
          </div>
          <button 
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors whitespace-nowrap"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Modals */}
      <DeleteAccountModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
      />
      <ChangePasswordModal 
        isOpen={changePasswordModalOpen} 
        onClose={() => setChangePasswordModalOpen(false)} 
      />
    </div>
  );
}

export default Settings;
