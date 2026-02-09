# Muraa - AI Interviewer

This is an Amazon hackathon submission for an AI-powered interviewer application.

## Project Structure

The project is organized into two main directories:

```
muraa/
├── frontend/          # React application (built with Vite)
├── backend/           # Node.js/Express API server
└── README.md
```

## Getting Started

### Frontend
The frontend is a React application built with Vite for fast development and optimized builds.

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to view the application.

### Backend
The backend is a Node.js server with Express, organized with a clear API structure.

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:5000`.

## Backend Structure

```
backend/
├── server.js                    # Main server entry point
├── package.json
└── src/
    ├── api/
    │   ├── routes/              # API route definitions
    │   └── controllers/         # Business logic handlers
    ├── config/                  # Configuration files
    └── utils/                   # Utility functions
```

## Features

- **React Frontend**: Modern UI built with React and Vite
- **Node.js Backend**: RESTful API with Express
- **Organized Structure**: Clear separation of concerns with routes, controllers, and utilities
- **Development Ready**: Hot reload enabled for both frontend and backend

## Development

Both frontend and backend support hot reload during development:
- Frontend uses Vite's HMR (Hot Module Replacement)
- Backend uses Node's `--watch` flag (Node 18+)

## License

ISC
