import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  resourceSchema,
  updateResourceSchema,
  idParamSchema,
  resourcesQuerySchema,
} from '../schemas/validation.schemas.js';
import { NotFoundError } from '../lib/errors.js';
import type { ResourceWithTags, ResourceTag, PrismaTransactionClient } from '../types/index.js';

export const resourcesRouter = Router();

// Get all resources with pagination and filtering
resourcesRouter.get(
  '/',
  validateQuery(resourcesQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, type, skillId, projectId, isRead, isFavorite, search, tagIds } = req.query as any;
    const skip = (page - 1) * limit;

    const where: any = { userId: req.userId };

    if (type) where.type = type;
    if (skillId) where.skillId = skillId;
    if (projectId) where.projectId = projectId;
    if (isRead !== undefined) where.isRead = isRead;
    if (isFavorite !== undefined) where.isFavorite = isFavorite;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tagIds?.length) {
      where.tags = { some: { tagId: { in: tagIds } } };
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
        include: {
          skill: { select: { id: true, name: true, icon: true } },
          project: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    const transformedResources = resources.map((resource: ResourceWithTags) => ({
      ...resource,
      tags: resource.tags.map((rt: ResourceTag) => rt.tag),
    }));

    res.json({
      success: true,
      data: transformedResources,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get single resource
resourcesRouter.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        skill: { select: { id: true, name: true, icon: true } },
        project: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!resource) {
      throw new NotFoundError('Resource');
    }

    res.json({
      success: true,
      data: {
        ...resource,
        tags: resource.tags.map((rt: ResourceTag) => rt.tag),
      },
    });
  })
);

// Create resource
resourcesRouter.post(
  '/',
  validate(resourceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const resource = await prisma.resource.create({
      data: {
        ...data,
        userId: req.userId!,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId: string) => ({ tagId })) }
          : undefined,
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
        type: 'READING',
        description: `Saved resource: ${resource.title}`,
        skillId: resource.skillId,
        projectId: resource.projectId,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...resource,
        tags: resource.tags.map((rt: ResourceTag) => rt.tag),
      },
    });
  })
);

// Update resource
resourcesRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validate(updateResourceSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { tagIds, ...data } = req.body;

    const existing = await prisma.resource.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Resource');
    }

    const resource = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      if (tagIds !== undefined) {
        await tx.resourceTag.deleteMany({ where: { resourceId: req.params.id } });
        if (tagIds.length > 0) {
          await tx.resourceTag.createMany({
            data: tagIds.map((tagId: string) => ({
              resourceId: req.params.id,
              tagId,
            })),
          });
        }
      }

      return tx.resource.update({
        where: { id: req.params.id },
        data,
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
        ...resource,
        tags: resource.tags.map((rt: ResourceTag) => rt.tag),
      },
    });
  })
);

// Delete resource
resourcesRouter.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.resource.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Resource');
    }

    await prisma.resource.delete({ where: { id: req.params.id } });

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  })
);

// Toggle favorite
resourcesRouter.post(
  '/:id/favorite',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.resource.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Resource');
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { isFavorite: !existing.isFavorite },
    });

    res.json({
      success: true,
      data: resource,
    });
  })
);

// Mark as read
resourcesRouter.post(
  '/:id/read',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await prisma.resource.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });

    if (!existing) {
      throw new NotFoundError('Resource');
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      data: resource,
    });
  })
);
