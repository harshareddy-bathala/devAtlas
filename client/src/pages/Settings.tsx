import { useState, useEffect, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import { 
  Trash2, 
  User,
  Mail,
  Key,
  Shield,
  Github,
  Check,
  X,
  Loader2,
  Edit3,
  Save,
  Link as LinkIcon,
  Unlink,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isEmailProvider, getLinkedProviders, linkGitHubAccount, unlinkProvider } from '../lib/firebase';
import api from '../utils/api';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { CollaborationPanel } from '../components/CollaborationPanel';

interface ProfileData {
  displayName: string;
  username: string;
  bio: string;
}

interface FirebaseAuthError extends Error {
  code?: string;
}

function Settings(): JSX.Element {
  const { user, refreshUserProfile } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);
  
  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: '',
    username: '',
    bio: ''
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileData | null>(null);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  
  // GitHub linking state
  const [linkingGithub, setLinkingGithub] = useState<boolean>(false);
  const [unlinkingGithub, setUnlinkingGithub] = useState<boolean>(false);
  
  const isEmailUser = isEmailProvider();
  const linkedProviders = getLinkedProviders();
  const hasGithubLinked = linkedProviders.includes('github.com');
  const hasGoogleLinked = linkedProviders.includes('google.com');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async (): Promise<void> => {
    setProfileLoading(true);
    try {
      const data = await api.getProfile();
      const profile: ProfileData = {
        displayName: data.displayName || '',
        username: data.username || '',
        bio: data.bio || ''
      };
      setProfileData(profile);
      setOriginalProfile(profile);
    } catch (error) {
      // Only use empty defaults - don't fall back to user.name from auth
      const profile: ProfileData = {
        displayName: '',
        username: '',
        bio: ''
      };
      setProfileData(profile);
      setOriginalProfile(profile);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!profileData.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setSavingProfile(true);
    try {
      await api.updateProfile(profileData);
      setOriginalProfile(profileData);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
      // Refresh user profile in context so sidebar updates
      refreshUserProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = (): void => {
    if (originalProfile) {
      setProfileData(originalProfile);
    }
    setIsEditingProfile(false);
  };

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
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1 text-white">Settings</h1>
        <p className="text-light-500 text-sm">Manage your account preferences</p>
      </div>

      {/* Profile Section */}
      <div className="bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent-primary" />
            <h2 className="font-semibold text-white">Profile</h2>
          </div>
          {!isEditingProfile ? (
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="text-xs text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCancelEdit}
                className="text-xs text-light-400 hover:text-white flex items-center gap-1"
                disabled={savingProfile}
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="text-xs text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
              >
                {savingProfile ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded bg-accent-primary flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full rounded object-cover" />
            ) : (
              profileData.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-xs text-light-500 mb-1">Display Name</label>
              {profileLoading ? (
                <div className="h-5 w-32 bg-dark-600 rounded animate-pulse" />
              ) : isEditingProfile ? (
                <input
                  type="text"
                  value={profileData.displayName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setProfileData({ ...profileData, displayName: e.target.value })}
                  className="input-field text-sm py-1.5"
                  placeholder="Your name"
                />
              ) : (
                <p className="text-sm font-medium text-white">{profileData.displayName || 'Not set'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-light-500 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-light-500" />
                <p className="text-sm text-light-400">{user?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-light-500 mb-1">Username</label>
              {profileLoading ? (
                <div className="h-5 w-24 bg-dark-600 rounded animate-pulse" />
              ) : isEditingProfile && !originalProfile?.username ? (
                <input
                  type="text"
                  value={profileData.username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setProfileData({ ...profileData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  className="input-field text-sm py-1.5"
                  placeholder="Choose a username"
                />
              ) : (
                <p className="text-sm text-light-400">
                  {profileData.username ? `@${profileData.username}` : 'Not set'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-light-500 mb-1">Bio</label>
              {profileLoading ? (
                <div className="h-5 w-40 bg-dark-600 rounded animate-pulse" />
              ) : isEditingProfile ? (
                <textarea
                  value={profileData.bio}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setProfileData({ ...profileData, bio: e.target.value })}
                  className="input-field text-sm py-1.5 resize-none"
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={200}
                />
              ) : (
                <p className="text-sm text-light-400">
                  {profileData.bio || 'No bio yet'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-4 h-4 text-accent-primary" />
          <h2 className="font-semibold text-white">Connected Accounts</h2>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-dark-700 border border-dark-600 rounded">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-white" />
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
                className="text-xs px-3 py-1.5 rounded bg-dark-600 text-light-400 hover:text-white hover:bg-dark-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {unlinkingGithub ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Unlink className="w-3 h-3" />
                )}
                Unlink
              </button>
            ) : (
              <button
                onClick={handleLinkGitHub}
                disabled={linkingGithub}
                className="text-xs px-3 py-1.5 rounded bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {linkingGithub ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LinkIcon className="w-3 h-3" />
                )}
                Link GitHub
              </button>
            )}
          </div>

          {hasGoogleLinked && (
            <div className="flex items-center justify-between p-3 bg-dark-700 border border-dark-600 rounded">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <div className="flex items-center gap-1 text-xs text-[#22C55E]">
                <Check className="w-3 h-3" />
                Linked
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="font-semibold text-white">Account Security</h2>
        </div>

        <div className="flex items-center justify-between p-3 bg-dark-700 border border-dark-600 rounded">
          <div className="flex items-center gap-3">
            <Key className="w-4 h-4 text-light-400" />
            <div>
              <p className="text-sm font-medium text-white">Password</p>
              <p className="text-xs text-light-500">
                {isEmailUser 
                  ? 'Change your account password' 
                  : 'Managed by your OAuth provider'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setChangePasswordModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded bg-dark-600 text-light-300 hover:text-white hover:bg-dark-500 transition-colors"
          >
            {isEmailUser ? 'Change' : 'View'}
          </button>
        </div>
      </div>

      {/* Account Management */}
      <div className="bg-dark-800 border border-[#F59E0B]/20 rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-4 h-4 text-[#F59E0B]" />
          <h2 className="font-semibold text-[#F59E0B]">Account Management</h2>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#F59E0B]/5 border border-[#F59E0B]/10 rounded">
          <div>
            <p className="text-sm font-medium text-white">Delete Account</p>
            <p className="text-xs text-light-500">
              Permanently delete your account and all data
            </p>
          </div>
          <button 
            onClick={() => setDeleteModalOpen(true)}
            className="text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Collaboration & Sharing */}
      <div className="bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-accent-primary" />
          <h2 className="font-semibold text-white">Collaboration & Sharing</h2>
        </div>
        <CollaborationPanel />
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
