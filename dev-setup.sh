#!/bin/bash

# Development setup script for Baby Bottle Planner
# This script sets up the development environment by:
# 1. Stopping any existing servers
# 2. Initializing Redis data
# 3. Starting the Express API server
# 4. Starting the Vite development server

# Print banner
echo "=================================================="
echo "  Baby Bottle Planner - Development Setup"
echo "=================================================="
echo ""

# Kill any running servers on ports 5173 (Vite) and 3000 (API)
echo "🛑 Stopping any running servers..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Clear port 3000 if something is still running
fuser -k 3000/tcp 2>/dev/null || true
echo "✅ Ports cleared"
echo ""

# Check if Redis URL is set
if [ -z "$REDIS_URL" ] && ! grep -q "REDIS_URL" .env; then
  echo "⚠️  Warning: REDIS_URL environment variable not found!"
  echo "   Make sure your .env file contains a valid Redis connection string."
  echo ""
fi

# Initialize Redis data
echo "🔄 Initializing Redis data..."
npx tsx src/scripts/init-all.ts
if [ $? -ne 0 ]; then
  echo "❌ Redis initialization failed. Please check your Redis connection."
  echo "   Make sure your REDIS_URL is set correctly in the .env file."
  exit 1
fi
echo ""

# Create a temporary local Redis file if needed
if [ ! -f ".env.local" ]; then
  echo "📝 Creating .env.local file for development..."
  cat > .env.local << EOL
# Development environment variables
NODE_ENV=development
EOL
  echo "✅ .env.local created"
else
  echo "✅ Using existing .env.local file"
fi
echo ""

# Start the Express server in the background
echo "🚀 Starting Express server on port 3000..."
pnpm run dev:server &
SERVER_PID=$!
echo "📋 Server process ID: $SERVER_PID"

# Wait for the server to start
echo "⏳ Waiting for server to start..."
for i in {1..10}; do
  sleep 1
  curl -s http://localhost:3000/ > /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ API server is running properly!"
    break
  fi
  
  if [ $i -eq 10 ]; then
    echo "❌ API server failed to start within timeout period."
    echo "   Check the server logs for more information."
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  
  echo "   Attempt $i/10: Server not ready yet, retrying..."
done
echo ""

# Test Redis connection
echo "🔍 Testing Redis connection..."
curl -s http://localhost:3000/api/redis/check-connection > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Redis connection verified"
else
  echo "⚠️  Warning: Could not verify Redis connection. Some features may not work."
fi
echo ""

# Start Vite dev server
echo "🚀 Starting Vite development server..."
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔌 API: http://localhost:3000"
echo ""
echo "🛑 Press Ctrl+C to stop all servers"
echo ""

# Start frontend
pnpm run dev

# When the script exits, kill the background server
echo ""
echo "🛑 Shutting down servers..."
trap "kill $SERVER_PID 2>/dev/null || true; echo '✅ All servers stopped'" EXIT 