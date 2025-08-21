import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

// Order management routes
router.post('/', OrderController.createOrder);
router.get('/', OrderController.getUserOrders);
router.get('/:id', OrderController.getOrder);
router.get('/:id/status', OrderController.getOrderStatus);
router.put('/:id/cancel', OrderController.cancelOrder);

// Admin routes (require admin role)
router.put('/:id/status', authMiddleware, OrderController.updateOrderStatus);

export default router;
