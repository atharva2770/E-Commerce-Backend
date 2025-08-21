import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, throwError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Validation schemas
const productFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['name', 'price', 'createdAt', 'rating']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().positive('Price must be positive'),
  comparePrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  dimensions: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  downloadUrl: z.string().url().optional(),
  stockQuantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

const updateProductSchema = createProductSchema.partial().extend({
  id: z.string().min(1, 'Product ID is required'),
});

export class ProductController {
  /**
   * Get products with advanced search and filtering
   */
  static getProducts = asyncHandler(async (req: Request, res: Response) => {
    const query = productFiltersSchema.parse(req.query);
    
    const {
      search,
      category,
      brand,
      minPrice,
      maxPrice,
      isActive,
      isFeatured,
      tags,
      sortBy = 'name',
      sortOrder = 'asc',
      page = 1,
      limit = 12,
    } = query;

    // Build where clause
    const where: any = {};

    // Search functionality - case-insensitive text search
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          shortDescription: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
        {
          tags: {
            hasSome: [search],
          },
        },
      ];
    }

    // Category filter
    if (category) {
      where.category = {
        slug: category,
      };
    }

    // Brand filter
    if (brand) {
      where.brand = {
        slug: brand,
      };
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    // Status filters
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      where.tags = {
        hasSome: tags,
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Execute query with relations
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            where: { isPrimary: true },
            take: 1,
            select: {
              url: true,
              alt: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate average rating for each product
    const productsWithRating = products.map((product) => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;

      return {
        ...product,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
        reviewCount: product._count.reviews,
        reviews: undefined,
        _count: undefined,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      success: true,
      data: {
        products: productsWithRating,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext,
          hasPrev,
          limit,
        },
      },
    });
  });

  /**
   * Get product by ID or slug
   */
  static getProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throwError('Product ID is required', 400);
    }

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: id as string },
          { slug: id as string },
        ],
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            url: true,
            alt: true,
            isPrimary: true,
          },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stockQuantity: true,
            attributes: true,
          },
        },
        reviews: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!product) {
      throwError('Product not found', 404);
    }

    // Calculate average rating
    const avgRating = product!.reviews.length > 0
      ? product!.reviews.reduce((sum, review) => sum + review.rating, 0) / product!.reviews.length
      : 0;

    const productWithRating = {
      ...product!,
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: product!._count.reviews,
      _count: undefined,
    };

    res.json({
      success: true,
      data: productWithRating,
    });
  });

  /**
   * Create new product (Admin only)
   */
  static createProduct = asyncHandler(async (req: Request, res: Response) => {
    const data = createProductSchema.parse(req.body);

    // Check if SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      throwError('Product with this SKU already exists', 409);
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const product = await prisma.product.create({
      data: {
        ...data,
        slug,
      } as any,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  });

  /**
   * Update product (Admin only)
   */
  static updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = updateProductSchema.parse({ ...req.body, id });

    if (!id) {
      throwError('Product ID is required', 400);
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: id as string },
    });

    if (!existingProduct) {
      throwError('Product not found', 404);
    }

    // Check if SKU is being changed and if it already exists
    if (data.sku && data.sku !== existingProduct!.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: data.sku },
      });

      if (skuExists) {
        throwError('Product with this SKU already exists', 409);
      }
    }

    // Generate new slug if name is being updated
    let slug = existingProduct!.slug;
    if (data.name && data.name !== existingProduct!.name) {
      slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const updateData: any = {
      ...data,
      description: data.description !== undefined ? data.description : existingProduct!.description,
      shortDescription: data.shortDescription !== undefined ? data.shortDescription : existingProduct!.shortDescription,
      comparePrice: data.comparePrice !== undefined ? data.comparePrice : existingProduct!.comparePrice,
      costPrice: data.costPrice !== undefined ? data.costPrice : existingProduct!.costPrice,
      weight: data.weight !== undefined ? data.weight : existingProduct!.weight,
      dimensions: data.dimensions !== undefined ? data.dimensions : existingProduct!.dimensions,
      downloadUrl: data.downloadUrl !== undefined ? data.downloadUrl : existingProduct!.downloadUrl,
      brandId: data.brandId !== undefined ? data.brandId : existingProduct!.brandId,
      metadata: data.metadata !== undefined ? data.metadata : existingProduct!.metadata,
      slug,
    };

    const product = await prisma.product.update({
      where: { id: id as string },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: product,
    });
  });

  /**
   * Delete product (Admin only)
   */
  static deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      throwError('Product ID is required', 400);
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: id as string },
    });

    if (!product) {
      throwError('Product not found', 404);
    }

    // Soft delete by setting isActive to false
    await prisma.product.update({
      where: { id: id as string },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  /**
   * Get product categories
   */
  static getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories,
    });
  });

  /**
   * Get product brands
   */
  static getBrands = asyncHandler(async (_req: Request, res: Response) => {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: brands,
    });
  });

  /**
   * Add product review
   */
  static addReview = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const userId = (req as any).user.id;

    if (!productId) {
      throwError('Product ID is required', 400);
    }

    const reviewSchema = z.object({
      rating: z.number().min(1).max(5),
      title: z.string().optional(),
      comment: z.string().optional(),
    });

    const data = reviewSchema.parse(req.body);

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId as string },
    });

    if (!product) {
      throwError('Product not found', 404);
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId: productId as string,
          userId,
        },
      },
    });

    if (existingReview) {
      throwError('You have already reviewed this product', 409);
    }

    const review = await prisma.review.create({
      data: {
        ...data,
        productId: productId as string,
        userId,
      } as any,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: review,
    });
  });
}
