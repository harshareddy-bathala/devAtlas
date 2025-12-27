/**
 * Collaboration Database Operations
 * 
 * Handles study groups, public profiles, and progress sharing
 */

const { getDb, admin } = require('../firebase');
const { NotFoundError, UnauthorizedError, ValidationError } = require('../errors');
const crypto = require('crypto');

// ==================== PUBLIC PROFILE ====================

/**
 * Get a user's public profile
 */
async function getPublicProfile(userId) {
  const db = getDb();
  const profileRef = db.collection('publicProfiles').doc(userId);
  const doc = await profileRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  return { id: doc.id, ...doc.data() };
}

/**
 * Get a public profile by slug
 */
async function getPublicProfileBySlug(slug) {
  const db = getDb();
  const snapshot = await db.collection('publicProfiles')
    .where('slug', '==', slug)
    .where('enabled', '==', true)
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    throw new NotFoundError('Profile not found');
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Update or create a user's public profile
 */
async function updatePublicProfile(userId, profileData) {
  const db = getDb();
  const profileRef = db.collection('publicProfiles').doc(userId);
  
  // Check if slug is unique
  if (profileData.slug) {
    const existing = await db.collection('publicProfiles')
      .where('slug', '==', profileData.slug)
      .get();
    
    const otherProfile = existing.docs.find(doc => doc.id !== userId);
    if (otherProfile) {
      throw new ValidationError('This profile URL is already taken');
    }
  }
  
  const profile = {
    ...profileData,
    userId,
    updatedAt: new Date().toISOString()
  };
  
  await profileRef.set(profile, { merge: true });
  return { id: userId, ...profile };
}

// ==================== STUDY GROUPS ====================

/**
 * Generate a unique invite code
 */
function generateInviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Get all study groups for a user
 */
async function getUserStudyGroups(userId) {
  const db = getDb();
  const snapshot = await db.collection('studyGroups')
    .where('memberIds', 'array-contains', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Get a specific study group
 */
async function getStudyGroup(groupId, userId = null) {
  const db = getDb();
  const groupRef = db.collection('studyGroups').doc(groupId);
  const doc = await groupRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Study group not found');
  }
  
  const group = doc.data();
  
  // Check if user has access (is a member or group is public)
  if (userId && !group.isPublic && !group.memberIds.includes(userId)) {
    throw new UnauthorizedError('You do not have access to this group');
  }
  
  return { id: doc.id, ...group };
}

/**
 * Create a new study group
 */
async function createStudyGroup(userId, groupData) {
  const db = getDb();
  const groupsRef = db.collection('studyGroups');
  
  const inviteCode = generateInviteCode();
  
  const group = {
    ...groupData,
    createdBy: userId,
    memberIds: [userId],
    members: [{
      id: userId,
      role: 'admin',
      joinedAt: new Date().toISOString()
    }],
    inviteCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const docRef = await groupsRef.add(group);
  return { id: docRef.id, ...group };
}

/**
 * Join a study group by invite code
 */
async function joinStudyGroup(userId, inviteCode) {
  const db = getDb();
  const snapshot = await db.collection('studyGroups')
    .where('inviteCode', '==', inviteCode.toUpperCase())
    .limit(1)
    .get();
  
  if (snapshot.empty) {
    throw new NotFoundError('Invalid invite code');
  }
  
  const doc = snapshot.docs[0];
  const group = doc.data();
  
  // Check if already a member
  if (group.memberIds.includes(userId)) {
    throw new ValidationError('You are already a member of this group');
  }
  
  // Add member
  const updatedMembers = [
    ...group.members,
    {
      id: userId,
      role: 'member',
      joinedAt: new Date().toISOString()
    }
  ];
  
  await doc.ref.update({
    memberIds: admin.firestore.FieldValue.arrayUnion(userId),
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });
  
  return { id: doc.id, ...group, members: updatedMembers, memberIds: [...group.memberIds, userId] };
}

/**
 * Leave a study group
 */
async function leaveStudyGroup(userId, groupId) {
  const db = getDb();
  const groupRef = db.collection('studyGroups').doc(groupId);
  const doc = await groupRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Study group not found');
  }
  
  const group = doc.data();
  
  // Check if user is a member
  if (!group.memberIds.includes(userId)) {
    throw new ValidationError('You are not a member of this group');
  }
  
  // Cannot leave if you're the only admin
  const admins = group.members.filter(m => m.role === 'admin');
  const isOnlyAdmin = admins.length === 1 && admins[0].id === userId;
  
  if (isOnlyAdmin && group.memberIds.length > 1) {
    throw new ValidationError('You must assign another admin before leaving');
  }
  
  // Remove member
  const updatedMembers = group.members.filter(m => m.id !== userId);
  const updatedMemberIds = group.memberIds.filter(id => id !== userId);
  
  // If no members left, delete the group
  if (updatedMemberIds.length === 0) {
    await groupRef.delete();
    return { success: true, deleted: true };
  }
  
  await groupRef.update({
    memberIds: updatedMemberIds,
    members: updatedMembers,
    updatedAt: new Date().toISOString()
  });
  
  return { success: true };
}

/**
 * Delete a study group (admin only)
 */
async function deleteStudyGroup(userId, groupId) {
  const db = getDb();
  const groupRef = db.collection('studyGroups').doc(groupId);
  const doc = await groupRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Study group not found');
  }
  
  const group = doc.data();
  
  // Check if user is admin
  const member = group.members.find(m => m.id === userId);
  if (!member || member.role !== 'admin') {
    throw new UnauthorizedError('Only admins can delete a study group');
  }
  
  await groupRef.delete();
  return { success: true };
}

// ==================== PROGRESS SHARING ====================

/**
 * Create a shareable link for progress
 */
async function createShare(userId, shareData) {
  const db = getDb();
  const sharesRef = db.collection('shares');
  
  const shareId = crypto.randomBytes(8).toString('hex');
  
  const share = {
    id: shareId,
    userId,
    type: shareData.type,
    itemId: shareData.itemId,
    createdAt: new Date().toISOString(),
    expiresAt: shareData.expiresIn 
      ? new Date(Date.now() + shareData.expiresIn * 24 * 60 * 60 * 1000).toISOString() 
      : null,
    views: 0
  };
  
  await sharesRef.doc(shareId).set(share);
  return share;
}

/**
 * Get a shared item
 */
async function getShare(shareId) {
  const db = getDb();
  const shareRef = db.collection('shares').doc(shareId);
  const doc = await shareRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Share not found');
  }
  
  const share = doc.data();
  
  // Check if expired
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
    throw new NotFoundError('This share link has expired');
  }
  
  // Increment view count
  await shareRef.update({
    views: admin.firestore.FieldValue.increment(1)
  });
  
  return share;
}

/**
 * Get all shares for a user
 */
async function getUserShares(userId) {
  const db = getDb();
  const snapshot = await db.collection('shares')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return snapshot.docs.map(doc => doc.data());
}

/**
 * Revoke a share
 */
async function revokeShare(userId, shareId) {
  const db = getDb();
  const shareRef = db.collection('shares').doc(shareId);
  const doc = await shareRef.get();
  
  if (!doc.exists) {
    throw new NotFoundError('Share not found');
  }
  
  if (doc.data().userId !== userId) {
    throw new UnauthorizedError('You cannot revoke this share');
  }
  
  await shareRef.delete();
  return { success: true };
}

module.exports = {
  // Public Profile
  getPublicProfile,
  getPublicProfileBySlug,
  updatePublicProfile,
  
  // Study Groups
  getUserStudyGroups,
  getStudyGroup,
  createStudyGroup,
  joinStudyGroup,
  leaveStudyGroup,
  deleteStudyGroup,
  
  // Progress Sharing
  createShare,
  getShare,
  getUserShares,
  revokeShare
};
