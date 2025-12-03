import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// SKILL SCHEMAS
// ============================================

export const skillSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').trim(),
  category: z
    .enum(['LANGUAGE', 'FRAMEWORK', 'LIBRARY', 'TOOL', 'DATABASE', 'RUNTIME', 'CLOUD', 'DEVOPS', 'OTHER'])
    .default('LANGUAGE'),
  status: z.enum(['WANT_TO_LEARN', 'LEARNING', 'MASTERED']).default('WANT_TO_LEARN'),
  icon: z.string().max(10).default('📚'),
  notes: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(100).default(0),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateSkillSchema = skillSchema.partial();

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters').trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional().default(''),
  status: z.enum(['IDEA', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('IDEA'),
  priority: z.number().int().min(0).max(100).default(0),
  githubUrl: z
    .string()
    .url('Invalid GitHub URL')
    .optional()
    .or(z.literal('')),
  demoUrl: z
    .string()
    .url('Invalid demo URL')
    .optional()
    .or(z.literal('')),
  techStack: z.array(z.string()).default([]),
  dueDate: z.coerce.date().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = projectSchema.partial();

// ============================================
// RESOURCE SCHEMAS
// ============================================

export const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300, 'Title must be less than 300 characters').trim(),
  url: z.string().url('Invalid URL').max(2000, 'URL must be less than 2000 characters'),
  type: z.enum(['DOCUMENTATION', 'VIDEO', 'COURSE', 'ARTICLE', 'TUTORIAL', 'BOOK', 'PODCAST', 'TOOL', 'OTHER']).default('ARTICLE'),
  notes: z.string().max(5000, 'Notes must be less than 5000 characters').optional().default(''),
  skillId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  isRead: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateResourceSchema = resourceSchema.partial();

// ============================================
// ACTIVITY SCHEMAS
// ============================================

export const activitySchema = z.object({
  date: z.coerce.date(),
  type: z.enum(['LEARNING', 'CODING', 'READING', 'PROJECT', 'REVIEW', 'PRACTICE', 'OTHER']),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional().default(''),
  skillId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  durationMinutes: z.number().int().min(0).optional(),
});

// ============================================
// TAG SCHEMAS
// ============================================

export const tagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must be less than 50 characters').trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color')
    .default('#8b5cf6'),
});

export const updateTagSchema = tagSchema.partial();

// ============================================
// TIME ENTRY SCHEMAS
// ============================================

export const timeEntrySchema = z.object({
  description: z.string().max(500).optional(),
  skillId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
});

export const updateTimeEntrySchema = timeEntrySchema.partial();

export const startTimerSchema = z.object({
  description: z.string().max(500).optional(),
  skillId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const skillsQuerySchema = paginationSchema.extend({
  status: z.enum(['WANT_TO_LEARN', 'LEARNING', 'MASTERED']).optional(),
  category: z.enum(['LANGUAGE', 'FRAMEWORK', 'LIBRARY', 'TOOL', 'DATABASE', 'RUNTIME', 'CLOUD', 'DEVOPS', 'OTHER']).optional(),
  search: z.string().optional(),
  tagIds: z.string().transform(s => s.split(',')).optional(),
});

export const projectsQuerySchema = paginationSchema.extend({
  status: z.enum(['IDEA', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  tagIds: z.string().transform(s => s.split(',')).optional(),
});

export const resourcesQuerySchema = paginationSchema.extend({
  type: z.enum(['DOCUMENTATION', 'VIDEO', 'COURSE', 'ARTICLE', 'TUTORIAL', 'BOOK', 'PODCAST', 'TOOL', 'OTHER']).optional(),
  skillId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  isRead: z.coerce.boolean().optional(),
  isFavorite: z.coerce.boolean().optional(),
  search: z.string().optional(),
  tagIds: z.string().transform(s => s.split(',')).optional(),
});

export const activitiesQuerySchema = paginationSchema.extend({
  type: z.enum(['LEARNING', 'CODING', 'READING', 'PROJECT', 'REVIEW', 'PRACTICE', 'OTHER']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  skillId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const timeEntriesQuerySchema = paginationSchema.extend({
  skillId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isRunning: z.coerce.boolean().optional(),
  tagIds: z.string().transform(s => s.split(',')).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SkillInput = z.infer<typeof skillSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type TagInput = z.infer<typeof tagSchema>;
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
