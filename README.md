# Baby Bottle Planner

A React application to help parents plan and track baby feeding schedules.

## Features

### Currently Working
- **Feeding Recommendations**: Age-based feeding recommendations are loaded from Redis and displayed in the Recommendations tab.
- **Settings Display**: View current feeding settings (windows, amounts, and locked feedings).
- **Redis Connection**: API endpoints for Redis connection checks and data retrieval.

### Working but Need Testing
- **Settings Override**: The ability to modify feeding settings is implemented but currently disabled via UI to ensure pediatrician-recommended settings are used.
- **Profile Information**: Baby profile data (age, birth date) is retrieved but needs validation testing.
- **AI-Powered Feeding Planner**: The "Plan Next 10 Feeds" functionality uses OpenAI to generate an intelligent feeding schedule. Falls back to rule-based scheduling if OpenAI API fails.

### Planned Future Features
- **Feeding Schedule Management**: Marking feedings as completed/incomplete and viewing feeding history.
- **Tracking Analytics**: Visual charts and statistics for feeding patterns and growth tracking.
- **Multi-Baby Support**: Ability to manage feeding schedules for multiple children.
- **Mobile Application**: Native mobile app version with push notifications for upcoming feedings.

## Architecture

The application uses:
- Frontend: React with shadcn/ui components
- Backend: Express server for API endpoints
- Database: Redis for data storage
- AI: OpenAI integration for smart feeding planning

## Environment Setup

This project requires the following environment variables:

```
# OpenAI API Key for AI-powered feeding planning
OPENAI_API_KEY=your_openai_api_key_here
```

To set up:
1. Create a `.env` file in the project root
2. Add your OpenAI API key
3. This file is gitignored for security

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components, which are built on top of Radix UI and Tailwind CSS.

### Adding UI Components

Before creating any new UI components:

1. **Check shadcn/ui First**
   - Visit [shadcn/ui components](https://ui.shadcn.com/docs/components)
   - Use the CLI to add components:
     ```bash
     npx shadcn-ui@latest add [component-name]
     ```
   - Example: `npx shadcn-ui@latest add skeleton`

2. **Component Location**
   - All shadcn/ui components are installed in `src/components/ui/`
   - Custom components that use these UI components go in `src/components/`

3. **Component Dependencies**
   - Some components have dependencies on others (like `cn` utility)
   - The CLI will automatically install all required dependencies

### Currently Installed Components

We have the following shadcn/ui components installed:

- `Alert`
- `Button`
- `Card`
- `Label`
- `Skeleton`
- `Switch`
- `Table`
- `Tabs`
- `Toast`

### Best Practices

1. **Always Check shadcn/ui First**
   - Before creating a new UI component, check if it exists in shadcn/ui
   - This ensures consistency and reduces duplicate code

2. **Use Consistent Imports**
   - Import from `@/components/ui` or relative paths
   - Example: `import { Button } from "@/components/ui/button"`

3. **Maintain Component Documentation**
   - When adding new shadcn/ui components, update this README
   - Document any custom variants or modifications

## Development

### Prerequisites

- Node.js 18+
- pnpm (We use pnpm as our package manager)

### Setup

1. Install pnpm if you haven't already:
   ```bash
   npm install -g pnpm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run development server:
   ```bash
   pnpm dev
   ```

### Adding New UI Components

```bash
# Check available components
pnpm dlx shadcn@latest add

# Install specific component
pnpm dlx shadcn@latest add [component-name]

# Update README.md with new component
``` 