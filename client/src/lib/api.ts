import type {
  PaginatedResponse,
  Skill,
  SkillInput,
  Project,
  ProjectInput,
  Resource,
  ResourceInput,
  Activity,
  ActivityInput,
  Tag,
  TagInput,
  TimeEntry,
  TimeEntryInput,
  StartTimerInput,
  DashboardStats,
  HeatmapData,
  ProgressData,
  TimeSummary,
  User,
  PaginationParams,
} from '../types';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  code: string;
  details: Array<{ field: string; message: string }> | null;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    details: Array<{ field: string; message: string }> | null = null
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || 'An error occurred', data.code, data.details);
  }

  return data.data !== undefined ? data.data : data;
}

function buildQueryString(params: object): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        searchParams.set(key, value.join(','));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================
// AUTH API
// ============================================

export const authApi = {
  async getMe(): Promise<User> {
    return fetchWithAuth('/auth/me');
  },

  async updateMe(data: Partial<User>): Promise<User> {
    return fetchWithAuth('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// SKILLS API
// ============================================

export const skillsApi = {
  async getAll(
    params: PaginationParams & {
      status?: string;
      category?: string;
      search?: string;
      tagIds?: string[];
    } = {}
  ): Promise<PaginatedResponse<Skill>> {
    const response = await fetchWithAuth<any>(`/skills${buildQueryString(params)}`);
    return {
      success: true,
      data: response.data || response,
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id: string): Promise<Skill> {
    return fetchWithAuth(`/skills/${id}`);
  },

  async create(data: SkillInput): Promise<Skill> {
    return fetchWithAuth('/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<SkillInput>): Promise<Skill> {
    return fetchWithAuth(`/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchWithAuth(`/skills/${id}`, {
      method: 'DELETE',
    });
  },

  async addTags(id: string, tagIds: string[]): Promise<Skill> {
    return fetchWithAuth(`/skills/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagIds }),
    });
  },

  async removeTag(id: string, tagId: string): Promise<void> {
    return fetchWithAuth(`/skills/${id}/tags/${tagId}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// PROJECTS API
// ============================================

export const projectsApi = {
  async getAll(
    params: PaginationParams & {
      status?: string;
      search?: string;
      tagIds?: string[];
    } = {}
  ): Promise<PaginatedResponse<Project>> {
    const response = await fetchWithAuth<any>(`/projects${buildQueryString(params)}`);
    return {
      success: true,
      data: response.data || response,
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id: string): Promise<Project> {
    return fetchWithAuth(`/projects/${id}`);
  },

  async create(data: ProjectInput): Promise<Project> {
    return fetchWithAuth('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ProjectInput>): Promise<Project> {
    return fetchWithAuth(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchWithAuth(`/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// RESOURCES API
// ============================================

export const resourcesApi = {
  async getAll(
    params: PaginationParams & {
      type?: string;
      skillId?: string;
      projectId?: string;
      isRead?: boolean;
      isFavorite?: boolean;
      search?: string;
      tagIds?: string[];
    } = {}
  ): Promise<PaginatedResponse<Resource>> {
    const response = await fetchWithAuth<any>(`/resources${buildQueryString(params)}`);
    return {
      success: true,
      data: response.data || response,
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getById(id: string): Promise<Resource> {
    return fetchWithAuth(`/resources/${id}`);
  },

  async create(data: ResourceInput): Promise<Resource> {
    return fetchWithAuth('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<ResourceInput>): Promise<Resource> {
    return fetchWithAuth(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchWithAuth(`/resources/${id}`, {
      method: 'DELETE',
    });
  },

  async toggleFavorite(id: string): Promise<Resource> {
    return fetchWithAuth(`/resources/${id}/favorite`, {
      method: 'POST',
    });
  },

  async markAsRead(id: string): Promise<Resource> {
    return fetchWithAuth(`/resources/${id}/read`, {
      method: 'POST',
    });
  },
};

// ============================================
// ACTIVITIES API
// ============================================

export const activitiesApi = {
  async getAll(
    params: PaginationParams & {
      type?: string;
      startDate?: string;
      endDate?: string;
      skillId?: string;
      projectId?: string;
    } = {}
  ): Promise<PaginatedResponse<Activity>> {
    const response = await fetchWithAuth<any>(`/activities${buildQueryString(params)}`);
    return {
      success: true,
      data: response.data || response,
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async create(data: ActivityInput): Promise<Activity> {
    return fetchWithAuth('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getHeatmap(): Promise<HeatmapData[]> {
    return fetchWithAuth('/activities/heatmap');
  },

  async getBreakdown(): Promise<
    Array<{ type: string; count: number; totalMinutes: number }>
  > {
    return fetchWithAuth('/activities/breakdown');
  },
};

// ============================================
// TAGS API
// ============================================

export const tagsApi = {
  async getAll(): Promise<Tag[]> {
    return fetchWithAuth('/tags');
  },

  async getById(id: string): Promise<Tag> {
    return fetchWithAuth(`/tags/${id}`);
  },

  async create(data: TagInput): Promise<Tag> {
    return fetchWithAuth('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<TagInput>): Promise<Tag> {
    return fetchWithAuth(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchWithAuth(`/tags/${id}`, {
      method: 'DELETE',
    });
  },

  async getItems(
    id: string
  ): Promise<{ skills: Skill[]; projects: Project[]; resources: Resource[] }> {
    return fetchWithAuth(`/tags/${id}/items`);
  },
};

// ============================================
// TIME ENTRIES API
// ============================================

export const timeEntriesApi = {
  async getAll(
    params: PaginationParams & {
      skillId?: string;
      projectId?: string;
      startDate?: string;
      endDate?: string;
      isRunning?: boolean;
      tagIds?: string[];
    } = {}
  ): Promise<PaginatedResponse<TimeEntry>> {
    const response = await fetchWithAuth<any>(`/time-entries${buildQueryString(params)}`);
    return {
      success: true,
      data: response.data || response,
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
  },

  async getRunning(): Promise<TimeEntry | null> {
    return fetchWithAuth('/time-entries/running');
  },

  async start(data: StartTimerInput): Promise<TimeEntry> {
    return fetchWithAuth('/time-entries/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async stop(notes?: string): Promise<TimeEntry> {
    return fetchWithAuth('/time-entries/stop', {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async create(data: TimeEntryInput): Promise<TimeEntry> {
    return fetchWithAuth('/time-entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<TimeEntryInput>): Promise<TimeEntry> {
    return fetchWithAuth(`/time-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    return fetchWithAuth(`/time-entries/${id}`, {
      method: 'DELETE',
    });
  },

  async getSummary(params: { startDate?: string; endDate?: string } = {}): Promise<TimeSummary> {
    return fetchWithAuth(`/time-entries/summary${buildQueryString(params)}`);
  },
};

// ============================================
// STATS API
// ============================================

export const statsApi = {
  async getDashboard(): Promise<DashboardStats> {
    return fetchWithAuth('/stats');
  },

  async getProgress(): Promise<ProgressData> {
    return fetchWithAuth('/stats/progress');
  },

  async getTimeSummary(period: 'week' | 'month' | 'year' = 'week'): Promise<{
    period: string;
    daily: Array<{ date: string; seconds: number }>;
    totalSeconds: number;
    entriesCount: number;
  }> {
    return fetchWithAuth(`/stats/time-summary?period=${period}`);
  },
};

export { ApiError };
