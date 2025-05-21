# NestMap - AI-Powered Trip Planning Platform

NestMap is an intelligent travel planning platform that transforms trip preparation into a dynamic, personalized experience through advanced location search, interactive planning tools, and AI-powered assistance.

## Features

- **AI-Powered Assistance**: Natural language trip planning, weather-based recommendations, budget options
- **Interactive Trip Planning**: Create detailed itineraries with visual map representation
- **Location Intelligence**: Advanced search and suggestion for points of interest
- **Collaboration**: Share trips and collaborate with friends and family
- **Weather Integration**: Get activity suggestions based on weather forecasts
- **Budget Planning**: Manage trip expenses with AI-suggested budget options
- **Mobile-First Design**: Responsive interface with gesture support for mobile devices

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **Map Integration**: Mapbox
- **AI Services**: OpenAI (GPT-4o)

## Getting Started

### Prerequisites

- Node.js 16+
- PostgreSQL database (or Supabase project)
- Mapbox account and API token
- OpenAI API key

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required variables:

```
# Database
DATABASE_URL=postgres://user:password@host:port/database

# Supabase Auth (if using Supabase)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox
MAPBOX_TOKEN=your_mapbox_token
VITE_MAPBOX_TOKEN=your_mapbox_token

# OpenAI
OPENAI_API_KEY=your_openai_api_key
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
node migrate-db.mjs

# Start development server
npm run dev
```

The application will be available at http://localhost:5000.

### Database Setup

If using a fresh PostgreSQL database:

1. Create a new database
2. Update the `DATABASE_URL` in your `.env` file
3. Run database migrations: `node migrate-db.mjs`

If using Supabase:
1. Create a new Supabase project
2. Use the SQL Editor to run the schema creation script (`schema/schema.sql`)
3. Update the `DATABASE_URL` with your Supabase PostgreSQL connection string
4. Update the Supabase Auth keys in your `.env` file

## Folder Structure

```
/client            # Frontend React application
  /src
    /components    # UI components
    /contexts      # React context providers
    /hooks         # Custom React hooks
    /lib           # Utility functions and constants
    /pages         # Page components
    /styles        # CSS and style-related files
/server            # Backend Express server
  /routes          # API route handlers
  /services        # Business logic services
  /middleware      # Express middlewares
/shared            # Shared code between frontend and backend
  /schema.ts       # Database schema definitions
/drizzle           # Database migration scripts
```

## API Routes

- `GET /api/trips` - List user trips
- `GET /api/trips/:id` - Get single trip details
- `POST /api/trips` - Create a new trip
- `PUT /api/trips/:id` - Update trip details
- `DELETE /api/trips/:id` - Delete a trip
- `GET /api/trips/:id/activities` - Get trip activities
- `POST /api/activities` - Create a new activity
- `PUT /api/activities/:id` - Update activity details
- `DELETE /api/activities/:id` - Delete an activity
- `POST /api/ai/assistant` - Get AI assistant responses
- `POST /api/ai/weather-activities` - Get weather-based activity suggestions
- `POST /api/ai/budget-options` - Get budget recommendations
- `POST /api/ai/find-location` - Search for locations with AI assistance

## Deployment

### Replit Deployment

The app is configured for easy deployment on Replit:

1. Fork the project to your Replit account
2. Add your environment secrets through the Replit secrets panel
3. Click the "Deploy" button in the Replit UI

### External Deployment

To deploy to other platforms:

1. Build the frontend: `npm run build`
2. Deploy the built application to your preferred hosting service
3. Ensure your environment variables are properly set on the hosting platform

## License

Released under the MIT License. See `LICENSE` file for details.

## Credits

- Map data provided by Mapbox
- AI capabilities powered by OpenAI
- Authentication provided by Supabase