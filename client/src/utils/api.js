import { getIdToken } from '../lib/firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function handleResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    throw new ApiError(
      data.error || 'An error occurred',
      data.code || 'UNKNOWN_ERROR',
      data.details
    );
  }
  
  return data.data !== undefined ? data.data : data;
}

async function fetchWithAuth(url, options = {}) {
  try {
    const token = await getIdToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });
    
    return handleResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR'
    );
  }
}

const api = {
  // Auth
  async getMe() {
    return fetchWithAuth('/auth/me');
  },

  // Stats
  async getStats() {
    return fetchWithAuth('/stats');
  },

  async getProgressData() {
    return fetchWithAuth('/stats/progress');
  },

  // Skills
  async getSkills() {
    return fetchWithAuth('/skills');
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

  // Projects
  async getProjects() {
    return fetchWithAuth('/projects');
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

  // Resources
  async getResources() {
    return fetchWithAuth('/resources');
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

  // Activities
  async getActivities() {
    return fetchWithAuth('/activities');
  },

  async getHeatmapData() {
    return fetchWithAuth('/activities/heatmap');
  },

  async createActivity(data) {
    return fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Export/Import
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
  }
};

export { ApiError };
export default api;
