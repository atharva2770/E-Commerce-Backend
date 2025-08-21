import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Log response details when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log level determined by status code
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    
    // Log additional details for errors
    if (res.statusCode >= 400) {
      console.error(`Error Response:`, {
        statusCode: res.statusCode,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        duration: `${duration}ms`,
      });
    }
  });
  
  next();
};
