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
  
  // Handle both old format (direct data) and new format ({ success, data })
  return data.data !== undefined ? data.data : data;
}

async function fetchWithErrorHandling(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return handleResponse(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network errors
    throw new ApiError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR'
    );
  }
}

const api = {
  // Stats
  async getStats() {
    return fetchWithErrorHandling(`${API_BASE}/stats`);
  },

  async getProgressData() {
    return fetchWithErrorHandling(`${API_BASE}/stats/progress`);
  },

  // Skills
  async getSkills() {
    return fetchWithErrorHandling(`${API_BASE}/skills`);
  },

  async createSkill(data) {
    return fetchWithErrorHandling(`${API_BASE}/skills`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateSkill(id, data) {
    return fetchWithErrorHandling(`${API_BASE}/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteSkill(id) {
    return fetchWithErrorHandling(`${API_BASE}/skills/${id}`, {
      method: 'DELETE'
    });
  },

  // Projects
  async getProjects() {
    return fetchWithErrorHandling(`${API_BASE}/projects`);
  },

  async createProject(data) {
    return fetchWithErrorHandling(`${API_BASE}/projects`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateProject(id, data) {
    return fetchWithErrorHandling(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteProject(id) {
    return fetchWithErrorHandling(`${API_BASE}/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Resources
  async getResources() {
    return fetchWithErrorHandling(`${API_BASE}/resources`);
  },

  async createResource(data) {
    return fetchWithErrorHandling(`${API_BASE}/resources`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateResource(id, data) {
    return fetchWithErrorHandling(`${API_BASE}/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteResource(id) {
    return fetchWithErrorHandling(`${API_BASE}/resources/${id}`, {
      method: 'DELETE'
    });
  },

  // Activities
  async getActivities() {
    return fetchWithErrorHandling(`${API_BASE}/activities`);
  },

  async getHeatmapData() {
    return fetchWithErrorHandling(`${API_BASE}/activities/heatmap`);
  },

  async createActivity(data) {
    return fetchWithErrorHandling(`${API_BASE}/activities`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Export/Import
  async exportData() {
    return fetchWithErrorHandling(`${API_BASE}/export`);
  },

  async importData(data) {
    return fetchWithErrorHandling(`${API_BASE}/import`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async clearAllData() {
    return fetchWithErrorHandling(`${API_BASE}/data`, {
      method: 'DELETE'
    });
  }
};

export { ApiError };
export default api;
