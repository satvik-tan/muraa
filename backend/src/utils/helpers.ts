// Utility functions
// Add reusable helper functions here
// Utility functions
// Add reusable helper functions here
import type { Request, Response, NextFunction } from "express";
export const formatDate = (date:Date) => {
  return new Date(date).toISOString();
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};


export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req:Request, res:Response, next:NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
