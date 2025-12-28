import { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  Github, 
  Twitter,
  Linkedin,
  Globe,
  Edit3,
  Save,
  X,
  Camera,
  Loader2,
  Target,
  Flame,
  FolderKanban,
  BookOpen,
  Users
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { StudyGroupsPanel } from '../components/CollaborationPanel';

// Helper to format date
function formatMemberSince(dateString?: string): string {
  if (!dateString) return 'Member';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Member';
    return `Member since ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } catch {
    return 'Member';
  }
}

// Achievement definitions with real conditions
interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  condition: (stats: any) => boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_skill',
    icon: '🎯',
    title: 'First Skill',
    description: 'Mastered first skill',
    condition: (stats) => (stats?.skills?.mastered || stats?.skills?.MASTERED || 0) >= 1
  },
  {
    id: 'on_fire',
    icon: '🔥',
    title: 'On Fire',
    description: '7-day streak',
    condition: (stats) => (stats?.currentStreak || 0) >= 7
  },
  {
    id: 'launcher',
    icon: '🚀',
    title: 'Launcher',
    description: '5 projects started',
    condition: (stats) => {
      const total = Object.values(stats?.projects || {}).reduce((sum: number, count: any) => sum + (count || 0), 0);
      return total >= 5;
    }
  },
  {
    id: 'power_user',
    icon: '⚡',
    title: 'Power User',
    description: '30-day streak',
    condition: (stats) => (stats?.currentStreak || 0) >= 30
  },
  {
    id: 'bookworm',
    icon: '📚',
    title: 'Bookworm',
    description: '10 resources saved',
    condition: (stats) => (stats?.resources || 0) >= 10
  },
  {
    id: 'skill_collector',
    icon: '💎',
    title: 'Skill Collector',
    description: '5 skills mastered',
    condition: (stats) => (stats?.skills?.mastered || stats?.skills?.MASTERED || 0) >= 5
  },
  {
    id: 'consistent',
    icon: '📅',
    title: 'Consistent',
    description: '14-day streak',
    condition: (stats) => (stats?.currentStreak || 0) >= 14
  },
  {
    id: 'project_master',
    icon: '🏆',
    title: 'Project Master',
    description: '3 projects completed',
    condition: (stats) => (stats?.projects?.completed || stats?.projects?.COMPLETED || 0) >= 3
  }
];

export default function Profile() {
  const { user, refreshUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [memberSince, setMemberSince] = useState<string>('');
  
  const [profileData, setProfileData] = useState({
    displayName: '',
    username: '',
    bio: '',
    location: '',
    website: '',
    github: '',
    twitter: '',
    linkedin: ''
  });
  
  const [originalData, setOriginalData] = useState(profileData);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [profile, statsData] = await Promise.all([
        api.getProfile(),
        api.getStats()
      ]);
      
      const data = {
        displayName: profile.displayName || user?.name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        github: profile.github || '',
        twitter: profile.twitter || '',
        linkedin: profile.linkedin || ''
      };
      
      setProfileData(data);
      setOriginalData(data);
      setStats(statsData);
      setMemberSince(profile.createdAt || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profileData.displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    setSaving(true);
    try {
      await api.updateProfile(profileData);
      setOriginalData(profileData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
      refreshUserProfile?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-accent-primary/30 via-accent-teal/20 to-accent-green/30" />
        
        {/* Profile Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-dark-700 border-4 border-dark-800 flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-light-500" />
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 p-1.5 bg-accent-primary rounded-full text-white hover:bg-accent-primary-hover transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Name & Actions */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.displayName}
                    onChange={(e) => handleChange('displayName', e.target.value)}
                    className="text-xl font-bold text-white bg-dark-700 border border-dark-600 rounded px-3 py-1 focus:outline-none focus:border-accent-primary"
                    placeholder="Display Name"
                  />
                ) : (
                  <h1 className="text-xl font-bold text-white">{profileData.displayName || 'User'}</h1>
                )}
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    className="text-sm text-light-500 bg-dark-700 border border-dark-600 rounded px-3 py-1 mt-1 focus:outline-none focus:border-accent-primary"
                    placeholder="@username"
                  />
                ) : (
                  profileData.username && (
                    <p className="text-sm text-light-500">@{profileData.username}</p>
                  )
                )}
              </div>
              
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-light-500 text-sm rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Bio */}
          <div className="mt-4">
            {isEditing ? (
              <textarea
                value={profileData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                className="w-full text-sm text-light-400 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 focus:outline-none focus:border-accent-primary resize-none"
                placeholder="Write a short bio about yourself..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-light-400">
                {profileData.bio || 'No bio yet. Click edit to add one!'}
              </p>
            )}
          </div>
          
          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-light-500">
            <div className="flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <input
                  type="text"
                  value={profileData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="bg-dark-700 border border-dark-600 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-accent-primary"
                  placeholder="Location"
                />
              </div>
            ) : (
              profileData.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.location}</span>
                </div>
              )
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatMemberSince(memberSince)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.skills?.mastered || stats?.skills?.MASTERED || 0}</p>
          <p className="text-xs text-light-500">Skills Mastered</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-white">
            {Object.values(stats?.projects || {}).reduce((sum: number, count: any) => sum + (typeof count === 'number' ? count : 0), 0)}
          </p>
          <p className="text-xs text-light-500">Projects</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.currentStreak || 0}</p>
          <p className="text-xs text-light-500">Day Streak</p>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-white">{stats?.resources || 0}</p>
          <p className="text-xs text-light-500">Resources</p>
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Social Links</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Website */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <Globe className="w-5 h-5 text-light-500" />
            </div>
            {isEditing ? (
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary"
                placeholder="https://yourwebsite.com"
              />
            ) : (
              <div className="flex-1">
                {profileData.website ? (
                  <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
                    {profileData.website.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  <span className="text-sm text-light-500">No website added</span>
                )}
              </div>
            )}
          </div>

          {/* GitHub */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <Github className="w-5 h-5 text-light-500" />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={profileData.github}
                onChange={(e) => handleChange('github', e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary"
                placeholder="github username"
              />
            ) : (
              <div className="flex-1">
                {profileData.github ? (
                  <a href={`https://github.com/${profileData.github}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
                    @{profileData.github}
                  </a>
                ) : (
                  <span className="text-sm text-light-500">No GitHub linked</span>
                )}
              </div>
            )}
          </div>

          {/* Twitter */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <Twitter className="w-5 h-5 text-light-500" />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={profileData.twitter}
                onChange={(e) => handleChange('twitter', e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary"
                placeholder="twitter username"
              />
            ) : (
              <div className="flex-1">
                {profileData.twitter ? (
                  <a href={`https://twitter.com/${profileData.twitter}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
                    @{profileData.twitter}
                  </a>
                ) : (
                  <span className="text-sm text-light-500">No Twitter linked</span>
                )}
              </div>
            )}
          </div>

          {/* LinkedIn */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-light-500" />
            </div>
            {isEditing ? (
              <input
                type="text"
                value={profileData.linkedin}
                onChange={(e) => handleChange('linkedin', e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-primary"
                placeholder="linkedin username"
              />
            ) : (
              <div className="flex-1">
                {profileData.linkedin ? (
                  <a href={`https://linkedin.com/in/${profileData.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-primary hover:underline">
                    {profileData.linkedin}
                  </a>
                ) : (
                  <span className="text-sm text-light-500">No LinkedIn linked</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Study Groups Section */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Study Groups</h2>
            <p className="text-xs text-light-500">Learn together with others</p>
          </div>
        </div>
        <StudyGroupsPanel />
      </div>

      {/* Achievements Section */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <span className="text-xs text-light-500">
            {ACHIEVEMENTS.filter(a => a.condition(stats)).length}/{ACHIEVEMENTS.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = achievement.condition(stats);
            return (
              <div 
                key={achievement.id}
                className={`flex flex-col items-center p-4 bg-dark-700/50 rounded-lg transition-all ${
                  isUnlocked ? 'ring-1 ring-accent-primary/30' : 'opacity-40 grayscale'
                }`}
              >
                <span className="text-3xl mb-2">{achievement.icon}</span>
                <p className="text-sm font-medium text-white text-center">{achievement.title}</p>
                <p className="text-xs text-light-500 text-center">{achievement.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
