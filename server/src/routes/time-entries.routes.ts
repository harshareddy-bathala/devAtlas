import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  timeEntrySchema,
  updateTimeEntrySchema,
  startTimerSchema,
  idParamSchema,
  timeEntriesQuerySchema,
} from '../schemas/validation.schemas.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import type { TimeEntryWithTags, TimeEntryTag, TimeGroupBy, PrismaTransactionClient, Skill, Project } from '../types/index.js';

export const timeEntriesRouter = Router();

// Get all time entries with pagination
timeEntriesRouter.get(
  '/',
  validateQuery(timeEntriesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortOrder, skillId, projectId, startDate, endDate, isRunning, tagIds } =
      req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };

    if (skillId) where.skillId = skillId;
    if (projectId) where.projectId = projectId;
    if (isRunning !== undefined) where.isRunning = isRunning;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = startDate;
      if (endDate) where.startTime.lte = endDate;
    }
    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: sortOrder },
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          project: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    const transformedEntries = entries.map((entry: TimeEntryWithTags) => ({
      ...entry,
      tags: entry.tags.map((et: TimeEntryTag) => et.tag),
    }));

    res.json({
      success: true,
      data: transformedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get running timer
timeEntriesRouter.get(
  '/running',
  asyncHandler(async (req: Request, res: Response) => {
    const runningEntry = await prisma.timeEntry.findFirst({
      where: { userId: req.userId, isRunning: true },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    res.json({
      success: true,
      data: runningEntry
        ? {
            ...runningEntry,
            tags: runningEntry.tags.map((et: TimeEntryTag) => et.tag),
            currentDuration: Math.floor((Date.now() - runningEntry.startTime.getTime()) / 1000),
          }
        : null,
    });
  })
);

// Start a new timer
timeEntriesRouter.post(
  '/start',
  validate(startTimerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if there's already a running timer
    const existingRunning = await prisma.timeEntry.findFirst({
      where: { userId: req.userId, isRunning: true },
    });

    if (existingRunning) {
      throw new ConflictError('A timer is already running. Stop it first.');
    }

    const { tagIds, ...data } = req.body;

    const entry = await prisma.timeEntry.create({
      data: {
        ...data,
        userId: req.userId!,
        startTime: new Date(),
        isRunning: true,
        tags: tagIds?.length ? { create: tagIds.map((tagId: string) => ({ tagId })) } : undefined,
      },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        tags: entry.tags.map((et: TimeEntryTag) => et.tag),
      },
    });
  })
);

// Stop running timer
timeEntriesRouter.post(
  '/stop',
  asyncHandler(async (req: Request, res: Response) => {
    const runningEntry = await prisma.timeEntry.findFirst({
      where: { userId: req.userId, isRunning: true },
    });

    if (!runningEntry) {
      throw new NotFoundError('Running timer');
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - runningEntry.startTime.getTime()) / 1000);

    const entry = await prisma.timeEntry.update({
      where: { id: runningEntry.id },
      data: {
        endTime,
        durationSeconds,
        isRunning: false,
        notes: req.body.notes,
      },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(),
        type: entry.projectId ? 'PROJECT' : 'CODING',
        description: entry.description || 'Completed work session',
        skillId: entry.skillId,
        projectId: entry.projectId,
        durationMinutes: Math.floor(durationSeconds / 60),
      },
    });

    res.json({
      success: true,
      data: {
        ...entry,
        tags: entry.tags.map((et: TimeEntryTag) => et.tag),
      },
    });
  })
);

// Create manual time entry
timeEntriesRouter.post(
  '/',
  validate(timeEntrySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, startTime, endTime, ...data } = req.body;

    const durationSeconds = endTime
      ? Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)
      : null;

    const entry = await prisma.timeEntry.create({
      data: {
        ...data,
        userId: req.userId!,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationSeconds,
        isRunning: !endTime,
        tags: tagIds?.length ? { create: tagIds.map((tagId: string) => ({ tagId })) } : undefined,
      },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        tags: entry.tags.map((et: TimeEntryTag) => et.tag),
      },
    });
  })
);

// Update time entry
timeEntriesRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateTimeEntrySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const existing = await prisma.timeEntry.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Time entry');
    }

    // Recalculate duration if times changed
    let updateData: any = { ...data };
    if (data.startTime || data.endTime) {
      const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
      const endTime = data.endTime ? new Date(data.endTime) : existing.endTime;
      if (endTime) {
        updateData.durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      }
    }

    const entry = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      if (tagIds !== undefined) {
        await tx.timeEntryTag.deleteMany({ where: { timeEntryId: req.params.id } });
        if (tagIds.length > 0) {
          await tx.timeEntryTag.createMany({
            data: tagIds.map((tagId: string) => ({
              timeEntryId: req.params.id,
              tagId,
            })),
          });
        }
      }

      return tx.timeEntry.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          project: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      });
    });

    res.json({
      success: true,
      data: {
        ...entry,
        tags: entry.tags.map((et: TimeEntryTag) => et.tag),
      },
    });
  })
);

// Delete time entry
timeEntriesRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.timeEntry.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Time entry');
    }

    await prisma.timeEntry.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: 'Time entry deleted successfully',
    });
  })
);

// Get time summary/aggregation
timeEntriesRouter.get(
  '/summary',
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, groupBy = 'day' } = req.query as any;

    const whereClause: any = {
      userId: req.userId,
      isRunning: false,
    };

    if (startDate || endDate) {
      whereClause.startTime = {};
      if (startDate) whereClause.startTime.gte = new Date(startDate);
      if (endDate) whereClause.startTime.lte = new Date(endDate);
    }

    // Get total time
    const totalAgg = await prisma.timeEntry.aggregate({
      where: whereClause,
      _sum: { durationSeconds: true },
      _count: { id: true },
    });

    // Get time by skill
    const bySkill = await prisma.timeEntry.groupBy({
      by: ['skillId'],
      where: { ...whereClause, skillId: { not: null } },
      _sum: { durationSeconds: true },
      _count: { id: true },
    });

    // Get time by project
    const byProject = await prisma.timeEntry.groupBy({
      by: ['projectId'],
      where: { ...whereClause, projectId: { not: null } },
      _sum: { durationSeconds: true },
      _count: { id: true },
    });

    // Enrich with names
    const skillIds = bySkill.map((s: TimeGroupBy) => s.skillId).filter(Boolean) as string[];
    const projectIds = byProject.map((p: TimeGroupBy) => p.projectId).filter(Boolean) as string[];

    const [skills, projects] = await Promise.all([
      prisma.skill.findMany({
        where: { id: { in: skillIds } },
        select: { id: true, name: true, icon: true },
      }),
      prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      }),
    ]);

    const skillMap = new Map(skills.map((s: { id: string; name: string; icon: string }) => [s.id, s]));
    const projectMap = new Map(projects.map((p: { id: string; name: string }) => [p.id, p]));

    res.json({
      success: true,
      data: {
        total: {
          seconds: totalAgg._sum.durationSeconds || 0,
          entries: totalAgg._count.id,
        },
        bySkill: bySkill.map((s: TimeGroupBy) => ({
          skill: skillMap.get(s.skillId!),
          seconds: s._sum.durationSeconds || 0,
          entries: s._count.id,
        })),
        byProject: byProject.map((p: TimeGroupBy) => ({
          project: projectMap.get(p.projectId!),
          seconds: p._sum.durationSeconds || 0,
          entries: p._count.id,
        })),
      },
    });
  })
);
