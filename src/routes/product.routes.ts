import { Router, Request, Response } from 'express';

const router = Router();

// Placeholder routes - to be implemented
router.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Product routes - to be implemented' });
});

export default router;
