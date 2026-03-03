// Utility functions
// Add reusable helper functions here

export const formatDate = (date:Date) => {
  return new Date(date).toISOString();
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

//@ts-ignore
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
