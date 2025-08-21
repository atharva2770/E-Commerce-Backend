import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { CustomError } from './error.middleware';

export const validateRequest = (req: Request, _res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Validation errors collected but not used in this implementation
    
    throw new CustomError('Validation failed', 400);
  }
  
  next();
};
