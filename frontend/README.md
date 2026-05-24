# NeuroTube Frontend

This directory contains the user interface for the NeuroTube project, built with React 19, TypeScript, and Vite.

## Tech Stack
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

## Local Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Note on Architecture
The frontend connects directly to the Go Fetcher Service for analyzing videos and to the Python ML Service for polling results and historical data. Make sure both backend services are running (either via Docker or locally) for the frontend to work correctly.
