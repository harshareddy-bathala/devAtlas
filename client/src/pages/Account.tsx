import { useState } from 'react';
import { 
  Shield, 
  Key, 
  Trash2, 
  Github, 
  Link as LinkIcon, 
  Users,
  Moon,
  Sun,
  Globe,
  Eye,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DeleteAccountModal from '../components/DeleteAccountModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { CollaborationPanel } from '../components/CollaborationPanel';
import toast from 'react-hot-toast';

export default function Account() {
  useAuth(); // For auth state
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // Theme toggle is currently fixed to dark mode in the app
    toast.success(`Theme toggling coming soon!`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-light-500 text-sm mt-1">Manage your account security and preferences</p>
      </div>

      {/* Appearance */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sun className="w-5 h-5 text-accent-primary" />
          <h2 className="font-semibold text-white">Appearance</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            {isDarkMode ? (
              <Moon className="w-5 h-5 text-light-400" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
            <div>
              <p className="text-sm font-medium text-white">Theme</p>
              <p className="text-xs text-light-500">
                {isDarkMode ? 'Dark mode enabled' : 'Light mode enabled'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isDarkMode ? 'bg-accent-primary' : 'bg-dark-600'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                isDarkMode ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Connected Accounts */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <LinkIcon className="w-5 h-5 text-accent-primary" />
          <h2 className="font-semibold text-white">Connected Accounts</h2>
        </div>

        <div className="space-y-3">
          {/* GitHub */}
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Github className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">GitHub</p>
                <p className="text-xs text-light-500">Connect your GitHub account for enhanced features</p>
              </div>
            </div>
            
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/15 text-accent-primary hover:bg-accent-primary/25 transition-colors text-sm"
            >
              <LinkIcon className="w-4 h-4" />
              Connect
            </button>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-white">Security</h2>
        </div>

        <div className="space-y-3">
          {/* Password */}
          <button 
            onClick={() => setChangePasswordModalOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-dark-700/50 rounded-lg hover:bg-dark-700 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Key className="w-5 h-5 text-light-400" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">Password</p>
                <p className="text-xs text-light-500">
                  Change your account password
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-light-500 group-hover:text-white transition-colors" />
          </button>

          {/* Two-Factor Auth (Placeholder) */}
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Lock className="w-5 h-5 text-light-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-light-500">Add an extra layer of security</p>
              </div>
            </div>
            <span className="px-3 py-1 text-xs bg-dark-600 text-light-500 rounded-full">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-5 h-5 text-accent-primary" />
          <h2 className="font-semibold text-white">Privacy</h2>
        </div>

        <div className="space-y-3">
          {/* Profile Visibility */}
          <div className="flex items-center justify-between p-4 bg-dark-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-dark-600 flex items-center justify-center">
                <Globe className="w-5 h-5 text-light-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Profile Visibility</p>
                <p className="text-xs text-light-500">Control who can see your profile</p>
              </div>
            </div>
            <select className="bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </div>

      {/* Collaboration */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-accent-primary" />
          <h2 className="font-semibold text-white">Collaboration & Sharing</h2>
        </div>
        <CollaborationPanel />
      </div>

      {/* Danger Zone */}
      <div className="bg-dark-800 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 className="w-5 h-5 text-red-500" />
          <h2 className="font-semibold text-red-400">Danger Zone</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-lg">
          <div>
            <p className="text-sm font-medium text-white">Delete Account</p>
            <p className="text-xs text-light-500">
              Permanently delete your account and all associated data
            </p>
          </div>
          <button 
            onClick={() => setDeleteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm"
          >
            <Trash2 className="w-4 h-4" />
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
