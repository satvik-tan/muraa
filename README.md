# Muraa

Muraa is an AI-powered mock interview platform that runs real-time voice interviews, generates transcripts, and helps teams evaluate candidates faster.

## What It Does

- Authenticated users can start AI-led mock interviews.
- Candidate audio is streamed live to an AI interviewer.
- The AI responds with voice + transcript in real time.
- Interview data (users, jobs, sessions, transcripts) is stored for later use.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- UI/UX: shadcn/ui components
- Auth: Stack Auth
- Backend API: Node.js, Express, TypeScript
- Realtime: WebSocket (ws)
- AI: AWS Bedrock (Amazon Nova)
- Database: PostgreSQL (Neon) with Prisma ORM

## Architecture

- Next.js frontend handles landing pages, auth flow, and interview UI.
- Express API handles protected REST endpoints for user sync, interview, and jobs.
- A dedicated WebSocket server streams interview audio between browser and Bedrock.
- Prisma provides typed data access for PostgreSQL models (User, Job, InterviewSession, Transcript).

## Setup (Local Development)

### 1. Prerequisites

- Node.js 20+
- npm
- PostgreSQL database URL
- AWS credentials with Bedrock access
- Stack Auth project keys

### 2. Install dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### 3. Environment variables

Create frontend/.env from frontend/.env.example and set:

- NEXT_PUBLIC_STACK_PROJECT_ID
- NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
- STACK_SECRET_SERVER_KEY

Create backend/.env from backend/.env.example and set:

- PORT=8000
- NODE_ENV=development
- STACK_PROJECT_ID
- DATABASE_URL
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

### 4. Database setup

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 5. Run the project (3 terminals)

Terminal 1 (Backend API):
```bash
cd backend
npm run dev
```

Terminal 2 (WebSocket server):
```bash
cd backend
npm run dev:ws
```

Terminal 3 (Frontend):
```bash
cd frontend
npm run dev
```

### 6. URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Health check: http://localhost:8000/health
- WebSocket: ws://localhost:8080

## Backend Port Note

Backend API runs on port 8000 (not 5000).
