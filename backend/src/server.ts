// ⚡ Load .env BEFORE any other import reads process.env
import './config/env.js';

import express from 'express';
import cors from 'cors';
import interviewRouter from './api/routes/interview.routes.js';
import userRouter from './api/routes/user.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Muraa AI Interviewer API',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Protected routes — all /api/interview/* require a valid Stack Auth token
app.use('/api/interview', interviewRouter);

// User sync — call POST /api/user/sync from frontend after signup/login
app.use('/api/user', userRouter);

// 404 fallback (log for debugging)
app.use((req, res) => {
  console.log(`❌ 404: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}`);
});

export default app;
