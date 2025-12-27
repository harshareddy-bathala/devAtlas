/**
 * CollaborationContext - Share progress and study groups
 * 
 * Features:
 * - Public profile generation
 * - Progress sharing links
 * - Study groups with invites
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface PublicProfile {
  enabled: boolean;
  slug: string;
  showSkills: boolean;
  showProjects: boolean;
  showStreak: boolean;
  bio: string;
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

interface StudyGroup {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  members: GroupMember[];
  inviteCode: string;
  focusAreas: string[];
  isPublic: boolean;
}

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
  avatar?: string;
}

interface ShareableProgress {
  id: string;
  type: 'skill' | 'project' | 'milestone';
  title: string;
  description: string;
  shareUrl: string;
  createdAt: string;
  expiresAt?: string;
}

interface CollaborationContextType {
  publicProfile: PublicProfile | null;
  studyGroups: StudyGroup[];
  sharedProgress: ShareableProgress[];
  isLoading: boolean;
  
  // Profile actions
  updatePublicProfile: (profile: Partial<PublicProfile>) => Promise<void>;
  generateProfileSlug: () => Promise<string>;
  
  // Study group actions
  createStudyGroup: (data: Omit<StudyGroup, 'id' | 'createdAt' | 'inviteCode' | 'members' | 'createdBy'>) => Promise<StudyGroup>;
  joinStudyGroup: (inviteCode: string) => Promise<void>;
  leaveStudyGroup: (groupId: string) => Promise<void>;
  deleteStudyGroup: (groupId: string) => Promise<void>;
  
  // Sharing actions
  shareProgress: (type: 'skill' | 'project' | 'milestone', itemId: string, expiresIn?: number) => Promise<ShareableProgress>;
  revokeShare: (shareId: string) => Promise<void>;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

const PROFILE_KEY = 'devOrbit_public_profile';
const GROUPS_KEY = 'devOrbit_study_groups';
const SHARES_KEY = 'devOrbit_shared_progress';

export function CollaborationProvider({ children }: { children: ReactNode }) {
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
  const [sharedProgress, setSharedProgress] = useState<ShareableProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const storedProfile = localStorage.getItem(PROFILE_KEY);
      const storedGroups = localStorage.getItem(GROUPS_KEY);
      const storedShares = localStorage.getItem(SHARES_KEY);

      if (storedProfile) setPublicProfile(JSON.parse(storedProfile));
      if (storedGroups) setStudyGroups(JSON.parse(storedGroups));
      if (storedShares) setSharedProgress(JSON.parse(storedShares));
    } catch {
      // Ignore parsing errors
    }
    setIsLoading(false);
  };

  // Generate unique slug
  const generateProfileSlug = useCallback(async (): Promise<string> => {
    const adjectives = ['coding', 'learning', 'growing', 'building', 'creating'];
    const nouns = ['dev', 'coder', 'learner', 'builder', 'maker'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}-${noun}-${num}`;
  }, []);

  // Update public profile
  const updatePublicProfile = useCallback(async (profile: Partial<PublicProfile>) => {
    try {
      const updated: PublicProfile = {
        enabled: false,
        slug: '',
        showSkills: true,
        showProjects: true,
        showStreak: true,
        bio: '',
        socialLinks: {},
        ...publicProfile,
        ...profile
      };

      // Generate slug if enabling for first time
      if (updated.enabled && !updated.slug) {
        updated.slug = await generateProfileSlug();
      }

      setPublicProfile(updated);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

      // Sync with server
      try {
        await api.updatePublicProfile(updated);
      } catch {
        // Continue with local update
      }

      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
      throw error;
    }
  }, [publicProfile, generateProfileSlug]);

  // Create study group
  const createStudyGroup = useCallback(async (
    data: Omit<StudyGroup, 'id' | 'createdAt' | 'inviteCode' | 'members' | 'createdBy'>
  ): Promise<StudyGroup> => {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const group: StudyGroup = {
      id: `group_${Date.now()}`,
      ...data,
      createdBy: 'current_user',
      createdAt: new Date().toISOString(),
      inviteCode,
      members: [{
        id: 'current_user',
        name: 'You',
        email: '',
        role: 'admin',
        joinedAt: new Date().toISOString()
      }]
    };

    const updated = [...studyGroups, group];
    setStudyGroups(updated);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(updated));

    // Sync with server
    try {
      const response = await api.createStudyGroup(data);
      
      if (response.data) {
        const serverGroup = response.data as StudyGroup;
        const updatedWithServer = updated.map(g => 
          g.id === group.id ? serverGroup : g
        );
        setStudyGroups(updatedWithServer);
        localStorage.setItem(GROUPS_KEY, JSON.stringify(updatedWithServer));
        return serverGroup;
      }
    } catch {
      // Continue with local
    }

    toast.success('Study group created!');
    return group;
  }, [studyGroups]);

  // Join study group
  const joinStudyGroup = useCallback(async (inviteCode: string) => {
    // Check if already in group
    const existing = studyGroups.find(g => g.inviteCode === inviteCode);
    if (existing) {
      toast.error('You are already in this group');
      return;
    }

    try {
      const response = await api.joinStudyGroup(inviteCode);

      if (response.data) {
        const updated = [...studyGroups, response.data as StudyGroup];
        setStudyGroups(updated);
        localStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
        toast.success('Joined study group!');
      }
    } catch {
      // Simulate joining for demo
      const mockGroup: StudyGroup = {
        id: `group_${Date.now()}`,
        name: 'Study Group',
        description: 'A group for learning together',
        createdBy: 'other_user',
        createdAt: new Date().toISOString(),
        inviteCode,
        focusAreas: ['Programming'],
        isPublic: false,
        members: [{
          id: 'current_user',
          name: 'You',
          email: '',
          role: 'member',
          joinedAt: new Date().toISOString()
        }]
      };
      
      const updated = [...studyGroups, mockGroup];
      setStudyGroups(updated);
      localStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
      toast.success('Joined study group!');
    }
  }, [studyGroups]);

  // Leave study group
  const leaveStudyGroup = useCallback(async (groupId: string) => {
    const updated = studyGroups.filter(g => g.id !== groupId);
    setStudyGroups(updated);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(updated));

    try {
      await api.leaveStudyGroup(groupId);
    } catch {
      // Continue with local
    }

    toast.success('Left study group');
  }, [studyGroups]);

  // Delete study group
  const deleteStudyGroup = useCallback(async (groupId: string) => {
    const group = studyGroups.find(g => g.id === groupId);
    if (!group) return;

    const updated = studyGroups.filter(g => g.id !== groupId);
    setStudyGroups(updated);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(updated));

    try {
      await api.deleteStudyGroup(groupId);
      toast.success('Study group deleted');
    } catch (error: any) {
      // If group doesn't exist on server (404), still remove locally
      if (error?.code === 'NOT_FOUND' || error?.message?.includes('404')) {
        toast.success('Study group removed');
      } else {
        // For other errors, restore the group
        setStudyGroups(studyGroups);
        localStorage.setItem(GROUPS_KEY, JSON.stringify(studyGroups));
        toast.error('Failed to delete study group');
      }
    }
  }, [studyGroups]);

  // Share progress
  const shareProgress = useCallback(async (
    type: 'skill' | 'project' | 'milestone',
    itemId: string,
    expiresIn?: number
  ): Promise<ShareableProgress> => {
    const shareId = Math.random().toString(36).substring(2, 10);
    const baseUrl = window.location.origin;
    
    const share: ShareableProgress = {
      id: `share_${Date.now()}`,
      type,
      title: `Shared ${type}`,
      description: '',
      shareUrl: `${baseUrl}/shared/${shareId}`,
      createdAt: new Date().toISOString(),
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000).toISOString() : undefined
    };

    const updated = [...sharedProgress, share];
    setSharedProgress(updated);
    localStorage.setItem(SHARES_KEY, JSON.stringify(updated));

    try {
      const response = await api.createShare({ type, itemId, expiresIn });
      
      if (response.data) {
        return response.data as ShareableProgress;
      }
    } catch {
      // Continue with local
    }

    // Copy to clipboard
    navigator.clipboard.writeText(share.shareUrl);
    toast.success('Link copied to clipboard!');

    return share;
  }, [sharedProgress]);

  // Revoke share
  const revokeShare = useCallback(async (shareId: string) => {
    const updated = sharedProgress.filter(s => s.id !== shareId);
    setSharedProgress(updated);
    localStorage.setItem(SHARES_KEY, JSON.stringify(updated));

    try {
      await api.revokeShare(shareId);
    } catch {
      // Continue with local
    }

    toast.success('Share link revoked');
  }, [sharedProgress]);

  return (
    <CollaborationContext.Provider value={{
      publicProfile,
      studyGroups,
      sharedProgress,
      isLoading,
      updatePublicProfile,
      generateProfileSlug,
      createStudyGroup,
      joinStudyGroup,
      leaveStudyGroup,
      deleteStudyGroup,
      shareProgress,
      revokeShare
    }}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}
