// Example route handler for interview endpoints
// This file can be expanded with actual interview routes

import express from 'express';

const router = express.Router();

// Example route for starting an interview
router.post('/start', (req, res) => {
  res.json({
    message: 'Interview started',
    interviewId: Date.now()
  });
});

// Example route for getting interview questions
router.get('/questions', (req, res) => {
  res.json({
    questions: [
      { id: 1, text: 'Tell me about yourself' },
      { id: 2, text: 'What are your strengths?' }
    ]
  });
});

export default router;
