import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import { 
  skillSchema, 
  updateSkillSchema, 
  idParamSchema, 
  skillsQuerySchema 
} from '../schemas/validation.schemas.js';
import { NotFoundError } from '../lib/errors.js';
import type { SkillWithTags, SkillTag, PrismaTransactionClient } from '../types/index.js';

export const skillsRouter = Router();

// Get all skills with pagination and filtering
skillsRouter.get(
  '/',
  validateQuery(skillsQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, status, category, search, tagIds } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };

    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { updatedAt: 'desc' },
        include: {
          tags: {
            include: { tag: true },
          },
          _count: {
            select: { resources: true, activities: true, timeEntries: true },
          },
        },
      }),
      prisma.skill.count({ where }),
    ]);

    // Transform tags for response
    const transformedSkills = skills.map((skill: SkillWithTags) => ({
      ...skill,
      tags: skill.tags.map((st: SkillTag) => st.tag),
    }));

    res.json({
      success: true,
      data: transformedSkills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get single skill
skillsRouter.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const skill = await prisma.skill.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        resources: { take: 5, orderBy: { createdAt: 'desc' } },
        _count: {
          select: { resources: true, activities: true, timeEntries: true },
        },
      },
    });

    if (!skill) {
      throw new NotFoundError('Skill');
    }

    res.json({
      success: true,
      data: {
        ...skill,
        tags: skill.tags.map((st: SkillTag) => st.tag),
      },
    });
  })
);

// Create skill
skillsRouter.post(
  '/',
  validate(skillSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const skill = await prisma.skill.create({
      data: {
        ...data,
        userId: req.userId!,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId: string) => ({ tagId })),
            }
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
        type: 'LEARNING',
        description: `Added skill: ${skill.name}`,
        skillId: skill.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...skill,
        tags: skill.tags.map((st: SkillTag) => st.tag),
      },
    });
  })
);

// Update skill
skillsRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateSkillSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    // Check ownership
    const existing = await prisma.skill.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Skill');
    }

    // Update skill and tags
    const skill = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      // If tagIds provided, update tags
      if (tagIds !== undefined) {
        await tx.skillTag.deleteMany({ where: { skillId: req.params.id } });
        if (tagIds.length > 0) {
          await tx.skillTag.createMany({
            data: tagIds.map((tagId: string) => ({
              skillId: req.params.id,
              tagId,
            })),
          });
        }
      }

      return tx.skill.update({
        where: { id: req.params.id },
        data,
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    // Log activity on status change
    if (data.status && data.status !== existing.status) {
      const statusLabels: Record<string, string> = {
        MASTERED: 'Mastered',
        LEARNING: 'Started learning',
        WANT_TO_LEARN: 'Added to wishlist',
      };
      await prisma.activity.create({
        data: {
          userId: req.userId!,
          date: new Date(),
          type: 'LEARNING',
          description: `${statusLabels[data.status] || 'Updated'}: ${skill.name}`,
          skillId: skill.id,
        },
      });
    }

    res.json({
      success: true,
      data: {
        ...skill,
        tags: skill.tags.map((st: SkillTag) => st.tag),
      },
    });
  })
);

// Delete skill
skillsRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.skill.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Skill');
    }

    await prisma.skill.delete({ where: { id: req.params.id } });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(),
        type: 'LEARNING',
        description: `Removed skill: ${existing.name}`,
      },
    });

    res.json({
      success: true,
      message: 'Skill deleted successfully',
    });
  })
);

// Bulk assign tags to skill
skillsRouter.post(
  '/:id/tags',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds } = req.body as { tagIds: string[] };

    const existing = await prisma.skill.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Skill');
    }

    // Add new tags (ignore duplicates)
    await prisma.skillTag.createMany({
      data: tagIds.map(tagId => ({
        skillId: req.params.id,
        tagId,
      })),
      skipDuplicates: true,
    });

    const skill = await prisma.skill.findUnique({
      where: { id: req.params.id },
      include: { tags: { include: { tag: true } } },
    });

    res.json({
      success: true,
      data: {
        ...skill,
        tags: skill?.tags.map((st: SkillTag) => st.tag),
      },
    });
  })
);

// Remove tag from skill
skillsRouter.delete(
  '/:id/tags/:tagId',
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.skill.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Skill');
    }

    await prisma.skillTag.delete({
      where: {
        skillId_tagId: {
          skillId: req.params.id,
          tagId: req.params.tagId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Tag removed from skill',
    });
  })
);
