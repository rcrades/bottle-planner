# API Setup for Baby Bottle Planner

This guide explains how the API works in the Baby Bottle Planner application and provides solutions to common issues, including the "Profile fetch failed" error.

## API Architecture

The Baby Bottle Planner uses a dual API setup:

### Development Environment
- **Frontend**: Vite server (port 5173)
- **Backend**: Express server (port 3000)
- **Data Storage**: Upstash Redis

### Production Environment (Vercel)
- **Frontend**: Static files built by Vite
- **Backend**: Vercel serverless functions
- **Data Storage**: Same Upstash Redis instance

## Setting Up the API

### 1. Environment Variables

Create a `.env` file in the project root with:

```
# Redis connection URL from Upstash dashboard
REDIS_URL=redis://default:your_password_here@your_upstash_endpoint:6379

# OpenAI API key for feeding planning
OPENAI_API_KEY=your_openai_key_here
```

### 2. Initialize Redis Data

Before using the API, you must initialize the Redis database:

```bash
# Run the initialization script
npx tsx src/scripts/init-all.ts
```

This script creates:
- Baby profile data
- Feeding recommendations
- Default settings
- Initial feeding plan

### 3. Start the Development Servers

Use the setup script to start both servers:

```bash
# Start both frontend and API servers
sh dev-setup.sh
```

Or start them separately:

```bash
# Start API server only
pnpm run dev:server

# Start frontend only (in another terminal)
pnpm run dev
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/redis/check-connection` | GET | Verify Redis connectivity |
| `/api/profile/get` | GET | Get baby profile data |
| `/api/recommendations/get` | GET | Get feeding recommendations |
| `/api/settings/get` | GET | Get user settings |
| `/api/settings/save` | POST | Save user settings |
| `/api/feedings/planned/get` | GET | Get planned feedings |
| `/api/feedings/actual/get` | GET | Get actual feedings |
| `/api/feedings/plan` | POST | Generate new feeding plan |
| `/api/feedings/recent` | GET | Get most recent feedings |
| `/api/feedings/actual/add` | POST | Add an actual feeding |
| `/api/feedings/actual/update` | POST | Update an actual feeding |
| `/api/feedings/actual/remove` | POST | Remove an actual feeding |

Legacy endpoints (for backward compatibility):
| `/api/feedings/get` | GET | Get all feedings (planned and actual) |
| `/api/actual-feedings/get` | GET | Get actual feedings |
| `/api/actual-feedings/add` | POST | Add an actual feeding |
| `/api/actual-feedings/update` | POST | Update an actual feeding |
| `/api/actual-feedings/remove` | POST | Remove an actual feeding |

## Troubleshooting Common Issues

### "Profile fetch failed: Invalid JSON response from server"

This error occurs when the profile API endpoint returns invalid JSON or an error response.

#### Solution Steps:

1. **Check Redis Connection**

   Verify Redis is connected and has the necessary data:

   ```bash
   # Run the Redis initialization script to check connection and data
   npx tsx src/scripts/init-all.ts
   ```

   If you see any errors, check your Redis URL in the `.env` file.

2. **Verify API Server**

   Make sure the API server is running:

   ```bash
   # Start the API server if it's not running
   pnpm run dev:server
   ```

   Then test the connection in a browser or with curl:
   
   ```bash
   curl http://localhost:3000/api/redis/check-connection
   ```

   You should see a response like: `{"connected":true,"message":"Successfully connected to Redis database"}`

3. **Check for Profile Data**

   Test the profile endpoint directly:

   ```bash
   curl http://localhost:3000/api/profile/get
   ```

   If this returns an error, the profile data may be missing. Reinitialize:

   ```bash
   npx tsx src/scripts/init-profile.ts
   ```

4. **Restart Both Servers**

   Kill any existing server processes and restart:

   ```bash
   # Use the setup script
   sh dev-setup.sh
   ```

5. **Check for Network Issues**

   - Ensure your ports 3000 and 5173 are available
   - Check firewall settings
   - Make sure your IP is allowed by Upstash Redis

### "Function Invocation Failed" Error in Vercel

If you see this error in Vercel production:

1. **Check Vercel Logs**
   - Go to your Vercel dashboard
   - Navigate to your project -> Deployments -> Latest
   - View the Function Logs

2. **Verify Environment Variables**
   - Make sure `REDIS_URL` is set correctly in Vercel
   - Confirm the `OPENAI_API_KEY` is valid

3. **Redis Connection Issues**
   - Make sure Vercel's IP range is allowed in Upstash Redis
   - Check if you're exceeding Redis connection limits

4. **Increase Function Memory/Timeout**
   - In `vercel.json`, adjust the serverless function settings:
   ```json
   "functions": {
     "api/index.js": {
       "memory": 1024,
       "maxDuration": 30
     }
   }
   ```

## Debugging API Responses

If you're still having issues, add debugging output:

1. In the browser console, add a Network breakpoint and examine the raw response

2. Add this code to your fetch calls for debugging:
   ```javascript
   fetch("/api/profile/get")
     .then(res => res.text())
     .then(text => {
       console.log("Raw response:", text);
       try {
         return JSON.parse(text);
       } catch (e) {
         console.error("JSON parse error:", e);
         console.error("Raw text:", text);
         throw new Error(`Invalid JSON: ${text.substring(0, 100)}...`);
       }
     })
     .then(data => console.log("Parsed data:", data))
     .catch(err => console.error("Fetch error:", err));
   ```

## Data Initialization

The API requires four types of data in Redis:

1. **Profile**: Baby's age and birth date
2. **Recommendations**: Age-specific feeding guidelines
3. **Settings**: User preferences for feeding schedules
4. **Feedings**: Current feeding plan

If any of these are missing, use the initialization scripts:

```bash
# Initialize all data at once
npx tsx src/scripts/init-all.ts

# Or initialize specific data:
npx tsx src/scripts/init-profile.ts
npx tsx src/scripts/init-recommendations.ts
npx tsx src/scripts/init-settings.ts
``` 