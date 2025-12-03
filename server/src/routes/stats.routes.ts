import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import type { SkillGroupBy, ProjectGroupBy, Activity, TimeEntry } from '../types/index.js';

export const statsRouter = Router();

// Get dashboard stats
statsRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      skillsByStatus,
      projectsByStatus,
      resourcesCount,
      activitiesCount,
      activeDays,
      totalTimeSeconds,
    ] = await Promise.all([
      prisma.skill.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      prisma.project.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true },
      }),
      prisma.resource.count({ where: { userId } }),
      prisma.activity.count({ where: { userId } }),
      prisma.activity.groupBy({
        by: ['date'],
        where: {
          userId,
          date: { gte: thirtyDaysAgo },
        },
      }),
      prisma.timeEntry.aggregate({
        where: { userId, isRunning: false },
        _sum: { durationSeconds: true },
      }),
    ]);

    const skillStats = Object.fromEntries(skillsByStatus.map((s: SkillGroupBy) => [s.status.toLowerCase(), s._count.id]));
    const projectStats = Object.fromEntries(projectsByStatus.map((p: ProjectGroupBy) => [p.status.toLowerCase(), p._count.id]));

    res.json({
      success: true,
      data: {
        skills: {
          mastered: skillStats['mastered'] || 0,
          learning: skillStats['learning'] || 0,
          want_to_learn: skillStats['want_to_learn'] || 0,
        },
        projects: {
          idea: projectStats['idea'] || 0,
          active: projectStats['active'] || 0,
          completed: projectStats['completed'] || 0,
          on_hold: projectStats['on_hold'] || 0,
          archived: projectStats['archived'] || 0,
        },
        resources: resourcesCount,
        totalActivities: activitiesCount,
        activeDaysLast30: activeDays.length,
        totalTimeTracked: totalTimeSeconds._sum.durationSeconds || 0,
      },
    });
  })
);

// Get progress data for charts
statsRouter.get(
  '/progress',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    // Get weekly activity counts
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        date: { gte: twelveWeeksAgo },
      },
      select: { date: true },
    });

    // Group by week
    const weekCounts: Record<string, number> = {};
    activities.forEach((a: { date: Date }) => {
      const week = getWeekNumber(a.date);
      weekCounts[week] = (weekCounts[week] || 0) + 1;
    });

    const weeklyActivities = Object.entries(weekCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, count]) => ({ week, count }));

    // Get skill progress over time
    const skillHistory = await prisma.activity.findMany({
      where: {
        userId,
        type: 'LEARNING',
        skillId: { not: null },
      },
      select: { date: true, skillId: true },
      orderBy: { date: 'asc' },
      take: 100,
    });

    res.json({
      success: true,
      data: {
        weeklyActivities,
        skillProgress: skillHistory,
      },
    });
  })
);

// Get time tracking summary
statsRouter.get(
  '/time-summary',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const { period = 'week' } = req.query;

    let startDate = new Date();
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    const entries = await prisma.timeEntry.findMany({
      where: {
        userId,
        isRunning: false,
        startTime: { gte: startDate },
      },
      select: {
        startTime: true,
        durationSeconds: true,
        skill: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Group by day
    const byDay: Record<string, number> = {};
    entries.forEach((e: { startTime: Date; durationSeconds: number | null }) => {
      const day = e.startTime.toISOString().split('T')[0]!;
      byDay[day] = (byDay[day] || 0) + (e.durationSeconds || 0);
    });

    const dailyData = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, seconds]) => ({ date, seconds }));

    res.json({
      success: true,
      data: {
        period,
        daily: dailyData,
        totalSeconds: entries.reduce((sum: number, e: { durationSeconds: number | null }) => sum + (e.durationSeconds || 0), 0),
        entriesCount: entries.length,
      },
    });
  })
);

function getWeekNumber(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-${String(weekNum).padStart(2, '0')}`;
}
