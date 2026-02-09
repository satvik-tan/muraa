// Utility functions
// Add reusable helper functions here

export const formatDate = (date) => {
  return new Date(date).toISOString();
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
