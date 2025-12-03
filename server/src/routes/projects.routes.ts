import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  projectSchema,
  updateProjectSchema,
  idParamSchema,
  projectsQuerySchema,
} from '../schemas/validation.schemas.js';
import { NotFoundError } from '../lib/errors.js';
import type { ProjectWithTags, ProjectTag, PrismaTransactionClient } from '../types/index.js';

export const projectsRouter = Router();

// Get all projects with pagination and filtering
projectsRouter.get(
  '/',
  validateQuery(projectsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, status, search, tagIds } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : [{ priority: 'desc' }, { updatedAt: 'desc' }],
        include: {
          tags: { include: { tag: true } },
          _count: {
            select: { resources: true, activities: true, timeEntries: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const transformedProjects = projects.map((project: ProjectWithTags) => ({
      ...project,
      tags: project.tags.map((pt: ProjectTag) => pt.tag),
    }));

    res.json({
      success: true,
      data: transformedProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get single project
projectsRouter.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        resources: { take: 10, orderBy: { createdAt: 'desc' } },
        timeEntries: {
          take: 10,
          orderBy: { startTime: 'desc' },
          where: { isRunning: false },
        },
        _count: {
          select: { resources: true, activities: true, timeEntries: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError('Project');
    }

    // Calculate total time spent
    const timeAgg = await prisma.timeEntry.aggregate({
      where: { projectId: project.id, isRunning: false },
      _sum: { durationSeconds: true },
    });

    res.json({
      success: true,
      data: {
        ...project,
        tags: project.tags.map((pt: ProjectTag) => pt.tag),
        totalTimeSeconds: timeAgg._sum.durationSeconds || 0,
      },
    });
  })
);

// Create project
projectsRouter.post(
  '/',
  validate(projectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const project = await prisma.project.create({
      data: {
        ...data,
        userId: req.userId!,
        startedAt: data.status === 'ACTIVE' ? new Date() : undefined,
        completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId: string) => ({ tagId })) }
          : undefined,
      },
      include: {
        tags: { include: { tag: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(),
        type: 'PROJECT',
        description: `Created project: ${project.name}`,
        projectId: project.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...project,
        tags: project.tags.map((pt: ProjectTag) => pt.tag),
      },
    });
  })
);

// Update project
projectsRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateProjectSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Project');
    }

    // Handle status transitions
    const updateData: any = { ...data };
    if (data.status && data.status !== existing.status) {
      if (data.status === 'ACTIVE' && !existing.startedAt) {
        updateData.startedAt = new Date();
      }
      if (data.status === 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    const project = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      if (tagIds !== undefined) {
        await tx.projectTag.deleteMany({ where: { projectId: req.params.id } });
        if (tagIds.length > 0) {
          await tx.projectTag.createMany({
            data: tagIds.map((tagId: string) => ({
              projectId: req.params.id,
              tagId,
            })),
          });
        }
      }

      return tx.project.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    // Log activity on status change
    if (data.status && data.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        COMPLETED: 'Completed',
        ACTIVE: 'Started working on',
        IDEA: 'Moved to ideas',
        ON_HOLD: 'Put on hold',
        ARCHIVED: 'Archived',
      };
      await prisma.activity.create({
        data: {
          userId: req.userId!,
          date: new Date(),
          type: 'PROJECT',
          description: `${statusLabels[data.status] || 'Updated'}: ${project.name}`,
          projectId: project.id,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...project,
        tags: project.tags.map((pt: ProjectTag) => pt.tag),
      },
    });
  })
);

// Delete project
projectsRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Project');
    }

    await prisma.project.delete({ where: { id: req.params.id } });

    await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(),
        type: 'PROJECT',
        description: `Removed project: ${existing.name}`,
      },
    });

    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  })
);
