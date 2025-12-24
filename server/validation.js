const { z } = require('zod');

// Helper to convert object to array (Firestore sometimes returns arrays as objects)
const arrayOrObjectToArray = z.union([
  z.array(z.string()),
  z.object({}).transform(() => []),
  z.record(z.string()).transform((obj) => Object.values(obj))
]).optional().default([]);

// Pagination validation schema
const paginationSchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => !isNaN(val) && val >= 1 && val <= 10000, {
      message: 'Page must be a positive integer between 1 and 10000'
    }),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20)
    .refine(val => !isNaN(val) && val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    }),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status', 'title'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
}).strict(); // Reject unknown query params

// Skill validation schema - strict mode (no passthrough)
const skillSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other'])
    .default('language'),
  status: z.enum(['want_to_learn', 'learning', 'mastered'])
    .default('want_to_learn'),
  icon: z.string().max(50).optional().default('📚'),
  linkedProjects: arrayOrObjectToArray
}).strict(); // Don't allow unexpected fields

// Project validation schema - strict mode
const projectSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .default(''),
  status: z.enum(['idea', 'active', 'completed'])
    .default('idea'),
  githubUrl: z.string()
    .url('Invalid GitHub URL')
    .optional()
    .or(z.literal('')),
  demoUrl: z.string()
    .url('Invalid demo URL')
    .optional()
    .or(z.literal('')),
  techStack: z.string()
    .max(500, 'Tech stack must be less than 500 characters')
    .optional()
    .default(''),
  linkedSkills: arrayOrObjectToArray
}).strict(); // Don't allow unexpected fields

// Resource validation schema
const resourceSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(300, 'Title must be less than 300 characters')
    .trim(),
  url: z.string()
    .url('Invalid URL')
    .max(2000, 'URL must be less than 2000 characters'),
  type: z.enum(['documentation', 'video', 'course', 'article', 'tutorial', 'other'])
    .default('article'),
  skillId: z.union([z.number().int().positive(), z.string(), z.null()])
    .optional()
    .transform(val => val ? parseInt(val) || null : null),
  projectId: z.union([z.number().int().positive(), z.string(), z.null()])
    .optional()
    .transform(val => val ? parseInt(val) || null : null),
  notes: z.string()
    .max(5000, 'Notes must be less than 5000 characters')
    .optional()
    .default('')
});

// Activity validation schema
const activitySchema = z.object({
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['learning', 'coding', 'reading', 'project', 'other']),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .default(''),
  skillId: z.union([z.number().int().positive(), z.string(), z.null()])
    .optional()
    .transform(val => val ? parseInt(val) || null : null),
  projectId: z.union([z.number().int().positive(), z.string(), z.null()])
    .optional()
    .transform(val => val ? parseInt(val) || null : null)
});

// ID parameter validation - supports both numeric IDs and Firestore document IDs
const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required').max(100, 'ID too long')
});

// Profile validation schema - for PUT /api/v1/profile
const profileSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be less than 100 characters')
    .trim(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-z0-9_]+$/, 'Username must contain only lowercase letters, numbers, and underscores')
    .optional(),
  purpose: z.string()
    .max(500, 'Purpose must be less than 500 characters')
    .optional()
    .default(''),
  bio: z.string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional()
    .default('')
});

// Import data validation schema - for validating imported data structure
const importSkillSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other']).optional().default('language'),
  status: z.enum(['want_to_learn', 'learning', 'mastered']).optional().default('want_to_learn'),
  icon: z.string().max(50).optional().default('📚'),
  linkedProjects: z.array(z.string()).optional().default([])
}).strip(); // Strip unknown fields for import

const importProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['idea', 'active', 'completed']).optional().default('idea'),
  githubUrl: z.string().url().optional().or(z.literal('')).default(''),
  github_url: z.string().url().optional().or(z.literal('')).default(''), // Support both formats
  demoUrl: z.string().url().optional().or(z.literal('')).default(''),
  demo_url: z.string().url().optional().or(z.literal('')).default(''), // Support both formats
  techStack: z.string().max(500).optional().default(''),
  tech_stack: z.string().max(500).optional().default(''), // Support both formats
  linkedSkills: z.array(z.string()).optional().default([])
}).strip();

const importResourceSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  url: z.string().url().max(2000),
  type: z.enum(['documentation', 'video', 'course', 'article', 'tutorial', 'other']).optional().default('article'),
  skillId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  notes: z.string().max(5000).optional().default('')
}).strip();

const importActivitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(0).max(1000).optional().default(1),
  types: z.record(z.number().int().min(0)).optional().default({}),
  lastActivity: z.string().max(1000).optional().default('')
}).strip();

// ============ BATCH UPDATE SCHEMAS ============
// For efficient bulk operations that reduce Firestore writes

// Partial skill update (for batch updates - allows partial data)
const skillUpdateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other']).optional(),
  status: z.enum(['want_to_learn', 'learning', 'mastered']).optional(),
  icon: z.string().max(50).optional(),
  linkedProjects: arrayOrObjectToArray
}).strict();

// Partial project update (for batch updates)
const projectUpdateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['idea', 'active', 'completed']).optional(),
  githubUrl: z.string().url().optional().or(z.literal('')),
  demoUrl: z.string().url().optional().or(z.literal('')),
  techStack: z.string().max(500).optional(),
  linkedSkills: arrayOrObjectToArray
}).strict();

// Partial resource update (for batch updates)
const resourceUpdateSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  url: z.string().url().max(2000).optional(),
  type: z.enum(['documentation', 'video', 'course', 'article', 'tutorial', 'other']).optional(),
  skillId: z.union([z.string(), z.null()]).optional(),
  projectId: z.union([z.string(), z.null()]).optional(),
  notes: z.string().max(5000).optional()
}).strict();

// Batch update schema - array of updates with IDs
const batchSkillUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1).max(100),
    data: skillUpdateSchema
  })).min(1).max(50) // Max 50 items per batch to prevent abuse
});

const batchProjectUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1).max(100),
    data: projectUpdateSchema
  })).min(1).max(50)
});

const batchResourceUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1).max(100),
    data: resourceUpdateSchema
  })).min(1).max(50)
});

// Full import data schema
const importDataSchema = z.object({
  skills: z.array(importSkillSchema).optional().default([]),
  projects: z.array(importProjectSchema).optional().default([]),
  resources: z.array(importResourceSchema).optional().default([]),
  activities: z.array(importActivitySchema).optional().default([]),
  // Profile is optional for backwards compatibility
  profile: z.object({
    displayName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    photoURL: z.string().url().optional().nullable(),
    createdAt: z.string().optional()
  }).optional(),
  exportedAt: z.string().optional(),
  version: z.string().optional()
}).strict(); // Strict mode - reject unknown fields at root level

module.exports = {
  skillSchema,
  projectSchema,
  resourceSchema,
  activitySchema,
  idParamSchema,
  profileSchema,
  paginationSchema,
  // Partial update schemas (for batch operations)
  skillUpdateSchema,
  projectUpdateSchema,
  resourceUpdateSchema,
  // Batch update schemas
  batchSkillUpdateSchema,
  batchProjectUpdateSchema,
  batchResourceUpdateSchema,
  // Import schemas
  importDataSchema,
  importSkillSchema,
  importProjectSchema,
  importResourceSchema,
  importActivitySchema
};
