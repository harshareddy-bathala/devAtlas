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
  github_url: string | null;
  demo_url: string | null;
  tech_stack: string[];
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

// API Error Codes for consistent error handling
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'PARSE_ERROR'
  | 'TOKEN_REFRESH_FAILED'
  | 'AUTH_NOT_READY'
  | 'UNKNOWN_ERROR';

// Extended API Error with retry capability
export interface RetryableApiError extends ApiError {
  retryable: boolean;
  retryFn?: () => Promise<unknown>;
}

// Request options with abort signal support
export interface ApiRequestOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

// Batch operation types
export interface BatchUpdateItem<T> {
  id: string;
  data: Partial<T>;
}

export interface BatchOperationResult {
  success: boolean;
  updated: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}

// Share/Collaboration types
export interface ShareConfig {
  type: 'skills' | 'projects' | 'profile';
  isPublic: boolean;
  expiresAt?: string;
}

export interface SharedData {
  id: string;
  userId: string;
  type: ShareConfig['type'];
  data: unknown;
  createdAt: string;
  expiresAt?: string;
}

// Goal types
export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: string;
  status: 'active' | 'completed' | 'abandoned';
  progress: number;
  linkedSkills?: string[];
  linkedProjects?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  title: string;
  description?: string;
  targetDate?: string;
  linkedSkillIds?: string[];
  linkedProjectIds?: string[];
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

// User Profile types
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: UserProfile['socialLinks'];
  isPublic?: boolean;
}

// Data Export types
export interface ExportOptions {
  format: 'json' | 'csv';
  includeSkills?: boolean;
  includeProjects?: boolean;
  includeResources?: boolean;
  includeActivities?: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: {
    skills: number;
    projects: number;
    resources: number;
  };
  errors?: string[];
}

