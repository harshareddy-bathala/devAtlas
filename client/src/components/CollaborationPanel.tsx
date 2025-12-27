/**
 * CollaborationPanel - UI for sharing and study groups
 * 
 * Features:
 * - Public profile settings
 * - Study groups management
 * - Share progress links
 */

import { useState } from 'react';
import { 
  Users, 
  Share2, 
  Globe, 
  Lock, 
  Copy, 
  ExternalLink,
  Plus,
  Trash2,
  X,
  UserPlus,
  LogOut,
  Link2,
  Github,
  Linkedin,
  Twitter
} from 'lucide-react';
import { useCollaboration } from '../contexts/CollaborationContext';
import toast from 'react-hot-toast';

export function PublicProfileSettings() {
  const { publicProfile, updatePublicProfile } = useCollaboration();
  const [formData, setFormData] = useState({
    enabled: publicProfile?.enabled ?? false,
    showSkills: publicProfile?.showSkills ?? true,
    showProjects: publicProfile?.showProjects ?? true,
    showStreak: publicProfile?.showStreak ?? true,
    bio: publicProfile?.bio ?? '',
    socialLinks: publicProfile?.socialLinks ?? {}
  });

  const handleSave = async () => {
    await updatePublicProfile(formData);
  };

  const profileUrl = publicProfile?.slug 
    ? `${window.location.origin}/u/${publicProfile.slug}` 
    : null;

  const copyProfileUrl = () => {
    if (profileUrl) {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile URL copied!');
    }
  };

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg">
      <div className="p-4 border-b border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-primary/20 rounded-lg">
              <Globe className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h3 className="font-medium text-light-100">Public Profile</h3>
              <p className="text-sm text-light-500">Share your learning progress</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-dark-600 peer-focus:ring-2 peer-focus:ring-accent-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-primary"></div>
          </label>
        </div>
      </div>

      {formData.enabled && (
        <div className="p-4 space-y-4">
          {profileUrl && (
            <div className="flex items-center gap-2 p-3 bg-dark-700 rounded-lg">
              <Link2 className="w-4 h-4 text-light-500 flex-shrink-0" />
              <span className="text-sm text-light-300 truncate flex-1">{profileUrl}</span>
              <button
                onClick={copyProfileUrl}
                className="p-1.5 hover:bg-dark-600 rounded transition-colors"
              >
                <Copy className="w-4 h-4 text-light-500" />
              </button>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 hover:bg-dark-600 rounded transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-light-500" />
              </a>
            </div>
          )}

          {/* Visibility Options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-light-300">Show on profile:</p>
            <div className="space-y-2">
              {[
                { key: 'showSkills', label: 'Skills & Progress' },
                { key: 'showProjects', label: 'Projects' },
                { key: 'showStreak', label: 'Learning Streak' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[item.key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-sm text-light-400">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-light-300 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell others about your learning journey..."
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-light-300 placeholder:text-light-500 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none"
              rows={3}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-light-300">Social Links</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'github', icon: Github, placeholder: 'GitHub username' },
                { key: 'linkedin', icon: Linkedin, placeholder: 'LinkedIn URL' },
                { key: 'twitter', icon: Twitter, placeholder: '@username' }
              ].map(item => (
                <div key={item.key} className="relative">
                  <item.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-500" />
                  <input
                    type="text"
                    value={formData.socialLinks[item.key as keyof typeof formData.socialLinks] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, [item.key]: e.target.value }
                    }))}
                    placeholder={item.placeholder}
                    className="w-full pl-9 pr-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm text-light-300 placeholder:text-light-500 focus:border-accent-primary"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save Profile Settings
          </button>
        </div>
      )}
    </div>
  );
}

export function StudyGroupsPanel() {
  const { studyGroups, createStudyGroup, joinStudyGroup, leaveStudyGroup, deleteStudyGroup } = useCollaboration();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    focusAreas: [] as string[],
    isPublic: false
  });

  const handleCreate = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    await createStudyGroup(newGroup);
    setShowCreateModal(false);
    setNewGroup({ name: '', description: '', focusAreas: [], isPublic: false });
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }
    await joinStudyGroup(inviteCode.trim().toUpperCase());
    setShowJoinModal(false);
    setInviteCode('');
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied!');
  };

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg">
      <div className="p-4 border-b border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-medium text-light-100">Study Groups</h3>
              <p className="text-sm text-light-500">Learn together with others</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-3 py-1.5 text-sm text-accent-primary hover:bg-dark-700 rounded transition-colors"
            >
              Join
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-dark-600">
        {studyGroups.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-light-500 mx-auto mb-3" />
            <p className="text-light-400">No study groups yet</p>
            <p className="text-sm text-light-500 mt-1">Create or join a group to learn together</p>
          </div>
        ) : (
          studyGroups.map(group => (
            <div key={group.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-light-200 truncate">{group.name}</h4>
                    {group.isPublic ? (
                      <Globe className="w-3.5 h-3.5 text-light-500" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-light-500" />
                    )}
                  </div>
                  {group.description && (
                    <p className="text-sm text-light-500 mt-0.5 line-clamp-1">{group.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-light-500">
                    <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
                    <span>Code: {group.inviteCode}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={() => copyInviteCode(group.inviteCode)}
                    className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                    title="Copy invite code"
                  >
                    <Copy className="w-4 h-4 text-light-500" />
                  </button>
                  {group.createdBy === 'current_user' ? (
                    <button
                      onClick={() => deleteStudyGroup(group.id)}
                      className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  ) : (
                    <button
                      onClick={() => leaveStudyGroup(group.id)}
                      className="p-1.5 hover:bg-dark-600 rounded transition-colors"
                      title="Leave group"
                    >
                      <LogOut className="w-4 h-4 text-light-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-600">
              <h3 className="font-semibold text-light-100">Create Study Group</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-dark-600 rounded"
              >
                <X className="w-5 h-5 text-light-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., React Study Circle"
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-light-300 placeholder:text-light-500 focus:border-accent-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-light-300 mb-1">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What will you learn together?"
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-light-300 placeholder:text-light-500 focus:border-accent-primary resize-none"
                  rows={3}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newGroup.isPublic}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent-primary focus:ring-accent-primary"
                />
                <span className="text-sm text-light-400">Make this group public (anyone can find and join)</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-dark-600">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-light-400 hover:text-light-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded transition-colors"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-dark-600">
              <h3 className="font-semibold text-light-100">Join Study Group</h3>
              <button 
                onClick={() => setShowJoinModal(false)}
                className="p-1 hover:bg-dark-600 rounded"
              >
                <X className="w-5 h-5 text-light-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-300 mb-1">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-light-300 text-center text-lg tracking-widest font-mono placeholder:text-light-500 focus:border-accent-primary uppercase"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-dark-600">
              <button
                onClick={() => setShowJoinModal(false)}
                className="px-4 py-2 text-sm text-light-400 hover:text-light-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ShareProgressButton({ 
  type, 
  itemId, 
  title 
}: { 
  type: 'skill' | 'project' | 'milestone';
  itemId: string;
  title: string;
}) {
  const { shareProgress } = useCollaboration();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareProgress(type, itemId);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-light-500 hover:text-accent-primary hover:bg-dark-600 rounded transition-colors disabled:opacity-50"
      title={`Share ${title}`}
    >
      <Share2 className="w-4 h-4" />
      <span className="hidden sm:inline">Share</span>
    </button>
  );
}

/**
 * CollaborationPanel - Combined component for Settings page
 * Includes public profile settings and study groups
 */
export function CollaborationPanel() {
  return (
    <div className="space-y-4">
      <PublicProfileSettings />
      <StudyGroupsPanel />
    </div>
  );
}

export default { PublicProfileSettings, StudyGroupsPanel, ShareProgressButton, CollaborationPanel };
