// Example route handler for interview endpoints
// This file can be expanded with actual interview routes

import express from 'express';
import { stackAuthMiddleware } from '../../middleware/stackAuth.middleware.js';
import { startInterview, getQuestions, getInterviewAccess } from '../controllers/interview.controller.js';

const router = express.Router();

// Apply Stack Auth middleware to ALL routes in this router
router.use(stackAuthMiddleware);

// Example route for starting an interview
router.post('/start', startInterview);

// Example route for getting interview questions
router.get('/questions', getQuestions);
router.get('/access/:shareId', getInterviewAccess);

export default router;
