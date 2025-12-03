import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateParams } from '../middleware/validate.middleware.js';
import { tagSchema, updateTagSchema, idParamSchema } from '../schemas/validation.schemas.js';
import { NotFoundError } from '../lib/errors.js';
import type { TagWithCount, TagWithItems } from '../types/index.js';

export const tagsRouter = Router();

// Get all tags for user
tagsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            skills: true,
            projects: true,
            resources: true,
            timeEntries: true,
          },
        },
      },
    });

    const tagsWithCount = tags.map((tag: TagWithCount) => ({
      ...tag,
      usageCount:
        tag._count.skills + tag._count.projects + tag._count.resources + tag._count.timeEntries,
    }));

    res.json({
      success: true,
      data: tagsWithCount,
    });
  })
);

// Get single tag with related items
tagsRouter.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tag = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        skills: {
          include: { skill: { select: { id: true, name: true, icon: true, status: true } } },
        },
        projects: {
          include: { project: { select: { id: true, name: true, status: true } } },
        },
        resources: {
          include: { resource: { select: { id: true, title: true, type: true } } },
        },
        _count: {
          select: { skills: true, projects: true, resources: true, timeEntries: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundError('Tag');
    }

    res.json({
      success: true,
      data: {
        ...tag,
        skills: tag.skills.map((s: { skill: any }) => s.skill),
        projects: tag.projects.map((p: { project: any }) => p.project),
        resources: tag.resources.map((r: { resource: any }) => r.resource),
      },
    });
  })
);

// Create tag
tagsRouter.post(
  '/',
  validate(tagSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tag = await prisma.tag.create({
      data: {
        ...req.body,
        userId: req.userId!,
      },
    });

    res.status(201).json({
      success: true,
      data: tag,
    });
  })
);

// Update tag
tagsRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTagSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Tag');
    }

    const tag = await prisma.tag.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      success: true,
      data: tag,
    });
  })
);

// Delete tag
tagsRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Tag');
    }

    await prisma.tag.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  })
);

// Get items by tag
tagsRouter.get(
  '/:id/items',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tag = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!tag) {
      throw new NotFoundError('Tag');
    }

    const [skills, projects, resources] = await Promise.all([
      prisma.skill.findMany({
        where: {
          userId: req.userId,
          tags: { some: { tagId: req.params.id } },
        },
        select: { id: true, name: true, icon: true, status: true, category: true },
      }),
      prisma.project.findMany({
        where: {
          userId: req.userId,
          tags: { some: { tagId: req.params.id } },
        },
        select: { id: true, name: true, status: true, techStack: true },
      }),
      prisma.resource.findMany({
        where: {
          userId: req.userId,
          tags: { some: { tagId: req.params.id } },
        },
        select: { id: true, title: true, url: true, type: true },
      }),
    ]);

    res.json({
      success: true,
      data: { skills, projects, resources },
    });
  })
);
