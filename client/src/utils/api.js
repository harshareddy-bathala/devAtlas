import { auth } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

class ApiError extends Error {
  constructor(message, code, details = null, retryable = false) {
    super(message);
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.retryFn = null;
  }
  
  // Allow setting a retry function for recoverable errors
  setRetryFn(fn) {
    this.retryFn = fn;
    return this;
  }
}

// Determine if an error is retryable
function isRetryableError(code, statusCode) {
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE'];
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  return retryableCodes.includes(code) || retryableStatuses.includes(statusCode);
}

// Token cache to avoid unnecessary refreshes
let tokenCache = {
  token: null,
  expiresAt: 0
};

// Wait for Firebase auth to be ready
function waitForAuth(timeout = 5000) {
  return new Promise((resolve, reject) => {
    // If already have a user, resolve immediately
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new ApiError('Authentication not ready. Please refresh the page.', 'AUTH_NOT_READY'));
    }, timeout);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeoutId);
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject(new ApiError('Not authenticated', 'UNAUTHORIZED'));
      }
    });
  });
}

// Get fresh token with caching
async function getValidToken(forceRefresh = false) {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (!forceRefresh && tokenCache.token && tokenCache.expiresAt > now + 300000) {
    return tokenCache.token;
  }
  
  // Wait for auth to be ready if no current user
  let user = auth.currentUser;
  if (!user) {
    user = await waitForAuth();
  }
  
  try {
    // Force refresh if token expired or close to expiring
    const token = await user.getIdToken(forceRefresh);
    
    // Cache the token (Firebase tokens expire in 1 hour)
    tokenCache = {
      token,
      expiresAt: now + 3600000 // 1 hour
    };
    
    return token;
  } catch (error) {
    console.error('Failed to get ID token:', error);
    tokenCache = { token: null, expiresAt: 0 };
    throw new ApiError('Session expired. Please sign in again.', 'TOKEN_REFRESH_FAILED');
  }
}

// Clear token cache (call on sign out)
function clearTokenCache() {
  tokenCache = { token: null, expiresAt: 0 };
}

async function handleResponse(response, returnFullResponse = false) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError('Server returned invalid response', 'PARSE_ERROR', null, true);
  }
  
  if (!response.ok) {
    const retryable = isRetryableError(data.code, response.status);
    
    // Handle auth errors
    if (response.status === 401) {
      clearTokenCache();
      throw new ApiError(
        data.error || 'Session expired. Please sign in again.',
        'UNAUTHORIZED',
        null,
        false
      );
    }
    if (response.status === 403) {
      throw new ApiError(
        data.error || 'You do not have permission to perform this action',
        'FORBIDDEN',
        null,
        false
      );
    }
    if (response.status === 429) {
      throw new ApiError(
        'Too many requests. Please wait a moment and try again.',
        'RATE_LIMITED',
        null,
        true // Rate limit errors are retryable after waiting
      );
    }
    if (response.status >= 500) {
      throw new ApiError(
        data.error || 'Server error. Please try again.',
        data.code || 'SERVER_ERROR',
        data.details,
        true // Server errors are often transient
      );
    }
    throw new ApiError(
      data.error || 'An error occurred',
      data.code || 'UNKNOWN_ERROR',
      data.details,
      retryable
    );
  }
  
  // Return full response with pagination if requested or if pagination is present
  if (returnFullResponse || data.pagination) {
    return {
      items: data.data,
      pagination: data.pagination || null
    };
  }
  
  return data.data !== undefined ? data.data : data;
}

async function fetchWithAuth(url, options = {}, retryCount = 0) {
  const makeRequest = async () => {
    try {
      const token = await getValidToken(retryCount > 0);
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      };

      const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        signal: options.signal // Pass abort signal if provided
      });
      
      // If unauthorized and haven't retried, try once with fresh token
      if (response.status === 401 && retryCount === 0) {
        clearTokenCache();
        return fetchWithAuth(url, options, 1);
      }
      
      return handleResponse(response);
    } catch (error) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError') {
        throw error;
      }
      
      if (error instanceof ApiError) {
        // Attach retry function to retryable errors
        if (error.retryable) {
          error.setRetryFn(() => fetchWithAuth(url, options, 0));
        }
        throw error;
      }
      
      // Network error handling
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = new ApiError(
          'Unable to connect to server. Please check your connection.',
          'NETWORK_ERROR',
          null,
          true
        );
        networkError.setRetryFn(() => fetchWithAuth(url, options, 0));
        throw networkError;
      }
    
      console.error('API Error:', error);
      const genericError = new ApiError(
        error.message || 'Network error. Please check your connection.',
        'NETWORK_ERROR',
        null,
        true
      );
      genericError.setRetryFn(() => fetchWithAuth(url, options, 0));
      throw genericError;
    }
  };
  
  return makeRequest();
}

const api = {
  // Auth
  async getMe() {
    return fetchWithAuth('/auth/me');
  },

  // Profile
  async getProfile() {
    return fetchWithAuth('/profile');
  },

  async updateProfile(data) {
    return fetchWithAuth('/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async checkUsername(username) {
    return fetchWithAuth(`/profile/check-username/${encodeURIComponent(username)}`);
  },

  // Account Management
  async deleteAccount(password) {
    return fetchWithAuth('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ password })
    });
  },

  async changePassword(currentPassword, newPassword) {
    return fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  async sendPasswordResetEmail(email) {
    return fetchWithAuth('/auth/reset-password-email', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  // Stats
  async getStats(options = {}) {
    return fetchWithAuth('/stats', options);
  },

  async getProgressData(options = {}) {
    return fetchWithAuth('/stats/progress', options);
  },

  // Skills
  async getSkills(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page);
    if (params.limit) queryParams.set('limit', params.limit);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/skills?${queryString}` : '/skills';
    return fetchWithAuth(url);
  },

  async createSkill(data) {
    return fetchWithAuth('/skills', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateSkill(id, data) {
    return fetchWithAuth(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteSkill(id) {
    return fetchWithAuth(`/skills/${id}`, {
      method: 'DELETE'
    });
  },

  // Batch update skills - reduces multiple writes to a single API call
  async batchUpdateSkills(updates) {
    return fetchWithAuth('/skills/batch', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  },

  // Projects
  async getProjects(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page);
    if (params.limit) queryParams.set('limit', params.limit);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/projects?${queryString}` : '/projects';
    return fetchWithAuth(url);
  },

  // Get projects with pagination metadata
  async getProjectsPaginated(params = {}) {
    const queryParams = new URLSearchParams();
    queryParams.set('page', params.page || 1);
    queryParams.set('limit', params.limit || 20);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    
    const response = await fetchWithAuth(`/projects?${queryParams.toString()}`);
    // Response structure: { items: [], pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage } }
    // But fetchWithAuth returns response.data, so we need the full response
    return response;
  },

  async createProject(data) {
    return fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProject(id, data) {
    return fetchWithAuth(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteProject(id) {
    return fetchWithAuth(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Batch update projects - reduces multiple writes to a single API call
  async batchUpdateProjects(updates) {
    return fetchWithAuth('/projects/batch', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  },

  // Resources
  async getResources(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set('page', params.page);
    if (params.limit) queryParams.set('limit', params.limit);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/resources?${queryString}` : '/resources';
    return fetchWithAuth(url);
  },

  async createResource(data) {
    return fetchWithAuth('/resources', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateResource(id, data) {
    return fetchWithAuth(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteResource(id) {
    return fetchWithAuth(`/resources/${id}`, {
      method: 'DELETE'
    });
  },

  // Batch update resources - reduces multiple writes to a single API call
  async batchUpdateResources(updates) {
    return fetchWithAuth('/resources/batch', {
      method: 'POST',
      body: JSON.stringify({ updates })
    });
  },

  // Activities
  async getActivities(options = {}) {
    return fetchWithAuth('/activities', options);
  },

  async getHeatmapData(options = {}) {
    return fetchWithAuth('/activities/heatmap', options);
  },

  async createActivity(data) {
    return fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Export/Import (kept for backward compatibility but deprecated)
  async exportData() {
    return fetchWithAuth('/export');
  },

  async importData(data) {
    return fetchWithAuth('/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async clearAllData() {
    return fetchWithAuth('/data', {
      method: 'DELETE'
    });
  },

  // Goals
  async getGoals() {
    return fetchWithAuth('/goals');
  },

  async getGoal(id) {
    return fetchWithAuth(`/goals/${id}`);
  },

  async createGoal(data) {
    return fetchWithAuth('/goals', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateGoal(id, data) {
    return fetchWithAuth(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteGoal(id) {
    return fetchWithAuth(`/goals/${id}`, {
      method: 'DELETE'
    });
  },

  async updateMilestone(goalId, milestoneId, completed) {
    return fetchWithAuth(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed })
    });
  },

  // Skill Dependencies
  async getDependencies() {
    return fetchWithAuth('/dependencies');
  },

  async getSkillDependencies(skillId) {
    return fetchWithAuth(`/skills/${skillId}/dependencies`);
  },

  async setSkillDependencies(skillId, prerequisites) {
    return fetchWithAuth(`/skills/${skillId}/dependencies`, {
      method: 'PUT',
      body: JSON.stringify({ prerequisites })
    });
  },

  async addPrerequisite(skillId, prerequisiteId) {
    return fetchWithAuth(`/skills/${skillId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ prerequisiteId })
    });
  },

  async removePrerequisite(skillId, prereqId) {
    return fetchWithAuth(`/skills/${skillId}/dependencies/${prereqId}`, {
      method: 'DELETE'
    });
  },

  // Custom Categories
  async getCategories() {
    return fetchWithAuth('/categories');
  },

  async createCategory(data) {
    return fetchWithAuth('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateCategory(id, data) {
    return fetchWithAuth(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteCategory(id) {
    return fetchWithAuth(`/categories/${id}`, {
      method: 'DELETE'
    });
  },

  async reorderCategories(categoryIds) {
    return fetchWithAuth('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ categoryIds })
    });
  },

  // Public Profile
  async getPublicProfile() {
    return fetchWithAuth('/profile/public');
  },

  async updatePublicProfile(data) {
    return fetchWithAuth('/profile/public', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Study Groups
  async getStudyGroups() {
    return fetchWithAuth('/study-groups');
  },

  async getStudyGroup(id) {
    return fetchWithAuth(`/study-groups/${id}`);
  },

  async createStudyGroup(data) {
    return fetchWithAuth('/study-groups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async joinStudyGroup(inviteCode) {
    return fetchWithAuth('/study-groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    });
  },

  async leaveStudyGroup(id) {
    return fetchWithAuth(`/study-groups/${id}/leave`, {
      method: 'POST'
    });
  },

  async deleteStudyGroup(id) {
    return fetchWithAuth(`/study-groups/${id}`, {
      method: 'DELETE'
    });
  },

  // Progress Sharing
  async getShares() {
    return fetchWithAuth('/shares');
  },

  async createShare(data) {
    return fetchWithAuth('/shares', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async revokeShare(id) {
    return fetchWithAuth(`/shares/${id}`, {
      method: 'DELETE'
    });
  },
  
  // Utility
  clearTokenCache
};

export { ApiError, clearTokenCache };
export default api;
