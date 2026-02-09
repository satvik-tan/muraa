# Muraa AI Interviewer - Backend

## Overview
Node.js backend for the AI Interviewer application.

## Project Structure
```
backend/
├── server.js                    # Main server entry point
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variables template
└── src/
    ├── api/
    │   ├── routes/              # API route definitions
    │   │   └── interview.routes.js
    │   └── controllers/         # Business logic handlers
    │       └── interview.controller.js
    ├── config/                  # Configuration files
    │   └── config.js
    └── utils/                   # Utility functions
        └── helpers.js
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
cd backend
npm install
```

### Running the Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` by default.

## API Endpoints

### Base URL
`http://localhost:5000`

### Available Endpoints
- `GET /` - Welcome message
- `GET /health` - Health check

## Environment Variables
Copy `.env.example` to `.env` and configure:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
