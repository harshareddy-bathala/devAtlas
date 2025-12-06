// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  theme: Theme;
  preferences: Record<string, unknown>;
  createdAt: string;
  lastLoginAt: string | null;
}

export type Theme = 'DARK' | 'LIGHT' | 'SYSTEM';

// Auth types
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Skill types
export type SkillCategory =
  | 'LANGUAGE'
  | 'FRAMEWORK'
  | 'LIBRARY'
  | 'TOOL'
  | 'DATABASE'
  | 'RUNTIME'
  | 'CLOUD'
  | 'DEVOPS'
  | 'OTHER';

export type SkillStatus = 'WANT_TO_LEARN' | 'LEARNING' | 'MASTERED';

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  icon: string;
  notes: string | null;
  priority: number;
  tags: Tag[];
  _count?: {
    resources: number;
    activities: number;
    timeEntries: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SkillInput {
  name: string;
  category?: SkillCategory;
  status?: SkillStatus;
  icon?: string;
  notes?: string;
  priority?: number;
  tagIds?: string[];
}

// Project types
export type ProjectStatus = 'IDEA' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: number;
  githubUrl: string | null;
  demoUrl: string | null;
  techStack: string[];
  githubRepoId: string | null;
  githubRepoName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  dueDate: string | null;
  tags: Tag[];
  totalTimeSeconds?: number;
  _count?: {
    resources: number;
    activities: number;
    timeEntries: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  priority?: number;
  githubUrl?: string;
  demoUrl?: string;
  techStack?: string[];
  dueDate?: string;
  tagIds?: string[];
}

// Resource types
export type ResourceType =
  | 'DOCUMENTATION'
  | 'VIDEO'
  | 'COURSE'
  | 'ARTICLE'
  | 'TUTORIAL'
  | 'BOOK'
  | 'PODCAST'
  | 'TOOL'
  | 'OTHER';

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: ResourceType;
  notes: string | null;
  isRead: boolean;
  isFavorite: boolean;
  rating: number | null;
  skillId: string | null;
  projectId: string | null;
  skill?: { id: string; name: string; icon: string } | null;
  project?: { id: string; name: string } | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface ResourceInput {
  title: string;
  url: string;
  type?: ResourceType;
  notes?: string;
  skillId?: string | null;
  projectId?: string | null;
  isRead?: boolean;
  isFavorite?: boolean;
  rating?: number | null;
  tagIds?: string[];
}

// Activity types
export type ActivityType =
  | 'LEARNING'
  | 'CODING'
  | 'READING'
  | 'PROJECT'
  | 'REVIEW'
  | 'PRACTICE'
  | 'OTHER';

export interface Activity {
  id: string;
  date: string;
  type: ActivityType;
  description: string | null;
  skillId: string | null;
  projectId: string | null;
  durationMinutes: number | null;
  skill?: { id: string; name: string; icon: string } | null;
  project?: { id: string; name: string } | null;
  createdAt: string;
}

export interface ActivityInput {
  date: string;
  type: ActivityType;
  description?: string;
  skillId?: string | null;
  projectId?: string | null;
  durationMinutes?: number;
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  color: string;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagInput {
  name: string;
  color?: string;
}

// Time tracking types
export interface TimeEntry {
  id: string;
  description: string | null;
  skillId: string | null;
  projectId: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  isRunning: boolean;
  notes: string | null;
  skill?: { id: string; name: string; icon: string } | null;
  project?: { id: string; name: string } | null;
  tags: Tag[];
  currentDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntryInput {
  description?: string;
  skillId?: string | null;
  projectId?: string | null;
  startTime: string;
  endTime?: string | null;
  notes?: string;
  tagIds?: string[];
}

export interface StartTimerInput {
  description?: string;
  skillId?: string | null;
  projectId?: string | null;
  tagIds?: string[];
}

// Stats types
export interface DashboardStats {
  skills: {
    mastered: number;
    learning: number;
    want_to_learn: number;
  };
  projects: {
    idea: number;
    active: number;
    completed: number;
    on_hold: number;
    archived: number;
  };
  resources: number;
  totalActivities: number;
  activeDaysLast30: number;
  totalTimeTracked: number;
}

export interface HeatmapData {
  date: string;
  count: number;
}

export interface WeeklyActivity {
  week: string;
  count: number;
}

export interface ProgressData {
  weeklyActivities: WeeklyActivity[];
  skillProgress: Array<{ date: string; skillId: string }>;
}

export interface TimeSummary {
  total: {
    seconds: number;
    entries: number;
  };
  bySkill: Array<{
    skill: { id: string; name: string; icon: string };
    seconds: number;
    entries: number;
  }>;
  byProject: Array<{
    project: { id: string; name: string };
    seconds: number;
    entries: number;
  }>;
}

// API types
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Array<{ field: string; message: string }>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
