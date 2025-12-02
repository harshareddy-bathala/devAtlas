const { z } = require('zod');

// Skill validation schema
const skillSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  category: z.enum(['language', 'framework', 'library', 'tool', 'database', 'runtime', 'other'])
    .default('language'),
  status: z.enum(['want_to_learn', 'learning', 'mastered'])
    .default('want_to_learn'),
  icon: z.string().max(10).default('📚')
});

// Project validation schema
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
    .default('')
});

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

// ID parameter validation
const idParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format')
});

module.exports = {
  skillSchema,
  projectSchema,
  resourceSchema,
  activitySchema,
  idParamSchema
};
