# API Setup in Bottle Planner

This document explains how APIs are set up in the Bottle Planner application. We have two distinct environments:

## Local Development

In development, we use:
1. A Vite development server for the frontend
2. An Express server (running on port 5000) for API endpoints
3. A proxy in the Vite config that forwards API requests to the Express server

### How to Run Locally

```bash
# Start both frontend and backend servers together
pnpm run dev:all

# Or start them separately
pnpm run dev        # Frontend only (Vite)
pnpm run dev:server # Backend only (Express)
```

## Production (Vercel)

In production, we use:
1. Vite-built static assets for the frontend
2. Vercel serverless functions for API endpoints
3. A rewrite in `vercel.json` that routes API requests to the serverless function

### How It Works

1. The `api/index.js` file contains the Express server code
2. `vercel.json` specifies the routing and server configuration
3. Environment variables like `OPENAI_API_KEY` and `REDIS_URL` need to be set in Vercel

## Fixing Common Issues

### Local "Invalid JSON" Errors

If you see "Unexpected token '<', "<!DOCTYPE "... is not valid JSON" in development:
1. Make sure the Express server is running (`pnpm run dev:server`)
2. Check that the Vite proxy is configured correctly in `vite.config.ts`

### Production "Invalid JSON" Errors

If you see JSON errors in production:
1. Check Vercel logs for server-side errors
2. Ensure all environment variables are set correctly in Vercel
3. Verify that Redis is accessible from Vercel's environment 