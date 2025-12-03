import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateQuery } from '../middleware/validate.middleware.js';
import { activitySchema, activitiesQuerySchema } from '../schemas/validation.schemas.js';

interface ActivityBreakdown {
  type: string;
  _count: { id: number };
  _sum: { durationMinutes: number | null };
}

export const activitiesRouter = Router();

// Get all activities with pagination
activitiesRouter.get(
  '/',
  validateQuery(activitiesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortOrder, type, startDate, endDate, skillId, projectId } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };

    if (type) where.type = type;
    if (skillId) where.skillId = skillId;
    if (projectId) where.projectId = projectId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: sortOrder },
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Create activity
activitiesRouter.post(
  '/',
  validate(activitySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const activity = await prisma.activity.create({
      data: {
        ...req.body,
        userId: req.userId!,
      },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      success: true,
      data: activity,
    });
  })
);

// Get heatmap data
activitiesRouter.get(
  '/heatmap',
  asyncHandler(async (req: Request, res: Response) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activities = await prisma.activity.groupBy({
      by: ['date'],
      where: {
        userId: req.userId,
        date: { gte: oneYearAgo },
      },
      _count: { id: true },
      orderBy: { date: 'asc' },
    });

    const heatmapData = activities.map((a: { date: Date; _count: { id: number } }) => ({
      date: a.date.toISOString().split('T')[0],
      count: a._count.id,
    }));

    res.json({
      success: true,
      data: heatmapData,
    });
  })
);

// Get activity breakdown by type
activitiesRouter.get(
  '/breakdown',
  asyncHandler(async (req: Request, res: Response) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const breakdown = await prisma.activity.groupBy({
      by: ['type'],
      where: {
        userId: req.userId,
        date: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _sum: { durationMinutes: true },
    });

    res.json({
      success: true,
      data: breakdown.map((b: ActivityBreakdown) => ({
        type: b.type,
        count: b._count.id,
        totalMinutes: b._sum.durationMinutes || 0,
      })),
    });
  })
);
