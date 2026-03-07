import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import interviewRouter from './api/routes/interview.routes.js';
import userRouter from './api/routes/user.routes.js';

// Load environment variables
dotenv.config();

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


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}`);
});

export default app;
