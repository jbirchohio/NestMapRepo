# NestMap Handoff Documentation

## Project Overview

NestMap is an intelligent AI-powered travel planning platform that transforms trip preparation into a dynamic, personalized experience through advanced location search, interactive planning tools, and innovative user engagement features.

## Key Features Implemented

- **Interactive Map Planning**: Plan your trip visually with an intuitive map interface
- **AI-Powered Assistant**: Get personalized recommendations for activities, restaurants, and more
- **Weather-Based Suggestions**: Receive activity recommendations based on weather forecasts
- **Budget Planning**: Get budget estimates and cost-saving tips for your trips
- **Collaborative Planning**: Share your trips with friends and family for collaborative editing
- **Activity Timeline**: Organize your day with a visual timeline of activities
- **Location Search**: Find points of interest with AI-enhanced location identification
- **Task Management**: Keep track of travel-related tasks with built-in to-do lists

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **Maps**: Mapbox GL JS
- **AI Integration**: OpenAI GPT-4o
- **State Management**: React Query, React Context

## Project Structure

- `/client`: Frontend React application
- `/server`: Backend Express server
- `/shared`: Shared types and utilities
- `/docs`: Documentation files
- `/schema`: Database schema and SQL scripts
- `/tests`: Test files for various features

## Key Components

### Authentication

- Implemented using Supabase authentication
- Email/password authentication flow
- User profile with avatar and display name
- Authentication persistence with local storage

### Trip Planning

- Create, read, update, delete trips
- Set trip dates, locations, and details
- View trips on interactive maps
- Timeline view for day-by-day planning

### Activities

- Add activities to specific days
- Assign locations with map coordinates
- Set times and durations
- Tag and categorize activities
- Mark activities as completed

### AI Assistant

- Natural language trip planning assistance
- Weather-based activity suggestions
- Budget planning and recommendations
- Itinerary parsing and import
- Food and restaurant recommendations

### Collaboration

- Share trips via unique share codes
- Invite collaborators by email
- Public/private trip visibility settings

## External Dependencies

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Supabase | Authentication & database | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| OpenAI | AI features | `OPENAI_API_KEY` |
| Mapbox | Map visualization | `MAPBOX_TOKEN`, `VITE_MAPBOX_TOKEN` |

## Setup Instructions

See the [SETUP_GUIDE.md](../SETUP_GUIDE.md) for detailed instructions on setting up the project.

## API Documentation

See [API.md](API.md) for detailed API endpoint documentation.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and their solutions.

## Future Enhancements

The following features were planned but not yet implemented:

1. **Calendar Integration**: Connect with Google Calendar, Apple Calendar
2. **Expense Tracking**: Track and split expenses between travelers
3. **Offline Support**: Progressive Web App with offline capabilities
4. **Mobile Apps**: Native mobile applications for iOS and Android
5. **Social Sharing**: Deeper integration with social media platforms

## Known Issues

1. The activity update endpoint has a type issue with the `travelMode` field when it's set to null
2. Authentication sometimes fails to refresh after session expiration
3. The map occasionally doesn't recenter properly when changing locations

## Contact

For any questions about this handoff, please contact the development team at [contact info].

---

## Handoff Checklist

- [x] Code repository is up-to-date
- [x] Environment variables documented in `.env.example`
- [x] Database schema is complete and documented
- [x] API endpoints documented
- [x] Setup instructions provided
- [x] Troubleshooting guide created
- [x] Known issues documented
- [x] Future enhancement ideas listed
- [x] All external dependencies documented