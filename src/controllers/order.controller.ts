import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { asyncHandler, throwError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, 'Product ID is required'),
    variantId: z.string().optional(),
    quantity: z.number().int().positive('Quantity must be positive'),
  })).min(1, 'At least one item is required'),
  shippingAddressId: z.string().min(1, 'Shipping address is required'),
  billingAddressId: z.string().min(1, 'Billing address is required'),
  paymentMethod: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CASH_ON_DELIVERY']),
  notes: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

interface OrderItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export class OrderController {
  /**
   * Create new order
   */
  static createOrder = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const data = createOrderSchema.parse(req.body);

    // Validate addresses belong to user
    const [shippingAddress, billingAddress] = await Promise.all([
      prisma.address.findFirst({
        where: { id: data.shippingAddressId, userId },
      }),
      prisma.address.findFirst({
        where: { id: data.billingAddressId, userId },
      }),
    ]);

    if (!shippingAddress) {
      throwError('Shipping address not found', 404);
    }

    if (!billingAddress) {
      throwError('Billing address not found', 404);
    }

    // Validate products and calculate totals
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of data.items) {
      const includeVariants = item.variantId ? {
        variants: {
          where: { id: item.variantId },
        },
      } : {};

      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: includeVariants,
      });

      if (!product) {
        throwError(`Product with ID ${item.productId} not found`, 404);
      }

      if (!product!.isActive) {
        throwError(`Product ${product!.name} is not available`, 400);
      }

      // Check stock
      const availableStock = item.variantId
        ? (product as any).variants?.[0]?.stockQuantity || 0
        : product!.stockQuantity;

      if (availableStock < item.quantity) {
        throwError(`Insufficient stock for ${product!.name}`, 400);
      }

      // Calculate price
      const unitPrice = item.variantId
        ? Number((product as any).variants?.[0]?.price || 0)
        : Number(product!.price);

      const itemTotal = unitPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice,
        totalPrice: itemTotal,
      });
    }

    // Calculate taxes and shipping (simplified)
    const taxAmount = subtotal * 0.1; // 10% tax
    const shippingAmount = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const totalAmount = subtotal + taxAmount + shippingAmount;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'PENDING',
          subtotal,
          taxAmount,
          shippingAmount,
          discountAmount: 0,
          totalAmount,
          currency: 'USD',
          notes: data.notes || null,
          shippingAddress: shippingAddress as any,
          billingAddress: billingAddress as any,
          paymentMethod: data.paymentMethod,
          paymentStatus: 'PENDING',
        },
      });

      // Create order items
      await Promise.all(
        orderItems.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              ...item,
            },
          })
        )
      );

      // Update product stock
      await Promise.all(
        orderItems.map((item) => {
          if (item.variantId) {
            return tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          } else {
            return tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  decrement: item.quantity,
                },
              },
            });
          }
        })
      );

      return newOrder;
    });

    // Send order confirmation email (placeholder)
    await OrderController.sendOrderConfirmationEmail(order.id);

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
      },
    });
  });

  /**
   * Get user orders
   */
  static getUserOrders = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                    select: { url: true },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / Number(limit));

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalCount,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  });

  /**
   * Get order by ID
   */
  static getOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!id) {
      throwError('Order ID is required', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        id: id as string,
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                images: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    url: true,
                    alt: true,
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throwError('Order not found', 404);
    }

    res.json({
      success: true,
      data: order,
    });
  });

  /**
   * Update order status (Admin only)
   */
  static updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = updateOrderStatusSchema.parse(req.body);

    if (!id) {
      throwError('Order ID is required', 400);
    }

    const order = await prisma.order.findUnique({
      where: { id: id as string },
    });

    if (!order) {
      throwError('Order not found', 404);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: id as string },
      data: {
        status: data.status,
        trackingNumber: data.trackingNumber || null,
        notes: data.notes || null,
        shippedAt: data.status === 'SHIPPED' ? new Date() : order!.shippedAt,
        deliveredAt: data.status === 'DELIVERED' ? new Date() : order!.deliveredAt,
      },
    });

    // Send status update email
    await OrderController.sendOrderStatusUpdateEmail(order!.id, data.status);

    res.json({
      success: true,
      data: updatedOrder,
    });
  });

  /**
   * Cancel order
   */
  static cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!id) {
      throwError('Order ID is required', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        id: id as string,
        userId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throwError('Order not found', 404);
    }

    if (order!.status !== 'PENDING' && order!.status !== 'CONFIRMED') {
      throwError('Order cannot be cancelled at this stage', 400);
    }

    // Cancel order and restore stock
    await prisma.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: id as string },
        data: { status: 'CANCELLED' },
      });

      // Restore product stock
      const orderWithItems = order as any;
      if (orderWithItems.items && Array.isArray(orderWithItems.items)) {
        await Promise.all(
          orderWithItems.items.map((item: any) => {
            if (item.variantId) {
              return tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stockQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            } else {
              return tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: {
                    increment: item.quantity,
                  },
                },
              });
            }
          })
        );
      }
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
    });
  });

  /**
   * Get order status for polling
   */
  static getOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!id) {
      throwError('Order ID is required', 400);
    }

    const order = await prisma.order.findFirst({
      where: {
        id: id as string,
        userId,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        trackingNumber: true,
        updatedAt: true,
      },
    });

    if (!order) {
      throwError('Order not found', 404);
    }

    res.json({
      success: true,
      data: order,
    });
  });

  /**
   * Send order confirmation email (placeholder)
   */
  private static async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending order confirmation email for order ${orderId}`);
  }

  /**
   * Send order status update email (placeholder)
   */
  private static async sendOrderStatusUpdateEmail(orderId: string, status: string): Promise<void> {
    // TODO: Implement email service integration
    console.log(`Sending order status update email for order ${orderId} with status ${status}`);
  }
}
