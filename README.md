# Baby Bottle Planner

A simple web application to help parents track and plan baby bottle feedings based on age-appropriate recommendations.

## Features

- 📱 Track and manage baby feeding schedules
- 📊 View feeding recommendations based on baby's age
- 🤖 AI-powered feeding plan generation
- ⏰ Schedule locked feedings at specific times
- ✅ Mark feedings as completed
- ⚙️ Customize settings for your baby's needs


## Buildplan Next Steps

- [ ] Add staging area for completed feedings in Redis (baby:completedFeedings)
- [ ] Create mobile-friendly completion dialog with amount adjustment
  - [ ] Pre-fill with planned amount
  - [ ] Add +/- buttons to adjust by 0.1 oz
  - [ ] Validate and save completed amount
- [ ] Update UI to show "Recently Completed" status for completed feedings
- [ ] Implement data push from plannedFeedings and completedFeedings
  - [ ] Update isCompleted in plannedFeedings when marking complete
  - [ ] Store completion details in completedFeedings
- [ ] Add completion timestamp and actual amount to completed feeding records
- [ ] Implement undo/revert capability for accidental completions

## Technology Stack

- **Frontend**: React with Vite, TailwindCSS, Shadcn UI components
- **Backend**: Express.js API for development, Vercel serverless functions for production
- **Database**: Upstash Redis for data storage
- **AI**: OpenAI GPT-4o for generating feeding plans

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [PNPM](https://pnpm.io/) package manager
- [Redis](https://redis.io/) database (Upstash Redis is used by default)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/bottle-planner.git
cd bottle-planner
```

### 2. Install Dependencies

```bash
# Install PNPM if you don't have it
npm install -g pnpm

# Install project dependencies
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# OpenAI API Key - Get this from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_key_here

# Redis connection URL - Get this from Upstash or your Redis provider
REDIS_URL=your_redis_url_here
```

### 4. Initialize Redis Data

Run the initialization script to set up the required data in Redis:

```bash
npx tsx src/scripts/init-all.ts
```

This will create the initial profiles, feeding recommendations, and settings in Redis.

### 5. Start the Development Server

Run the development setup script which will:
- Kill any existing processes on ports 3000 and 5173
- Initialize Redis data if needed
- Start the Express API server on port 3000
- Start the Vite frontend on port 5173

```bash
# Use the development setup script
sh dev-setup.sh

# OR start the servers manually
pnpm run dev:server  # Start the API server
pnpm run dev         # Start the Vite dev server in a separate terminal
```

### 6. Access the Application

- 📱 Frontend: [http://localhost:5173](http://localhost:5173)
- 🔌 API: [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

This application is designed to be deployed on Vercel with the following configuration:

1. Create a new Vercel project and connect your GitHub repository

2. Set the following environment variables in your Vercel project:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `REDIS_URL`: Your Upstash Redis connection URL

3. Use the following build settings:
   - Build Command: `pnpm run build`
   - Output Directory: `dist`

4. Deploy the application

The `vercel.json` file in the repository configures the serverless functions correctly.

## Project Structure

```
bottle-planner/
├── api/                  # Vercel API serverless functions
├── app/                  # Next.js-compatible components
├── components/           # UI components
├── dist/                 # Build output
├── hooks/                # React hooks
├── lib/                  # Utility libraries
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Main application pages
│   ├── scripts/          # Initialization scripts
│   ├── server/           # Express server and API routes
│   └── types/            # TypeScript type definitions
└── styles/               # Global styles
```

## Development Workflow

1. Make changes to the code
2. Test locally using `sh dev-setup.sh`
3. Commit and push your changes
4. Deploy to Vercel automatically via GitHub integration

## Troubleshooting

### Redis Connection Issues

If you have trouble connecting to Redis:

1. Verify your `REDIS_URL` in the `.env` file
2. Run `npx tsx src/scripts/init-all.ts` to check the connection
3. Check if your IP is allowed in Upstash Redis access controls

### API Errors

If the API returns errors:

1. Check if the Express server is running (`pnpm run dev:server`)
2. Verify Redis connection and data initialization
3. Check the server logs for more details

## License

This project is licensed under the MIT License - see the LICENSE file for details. 