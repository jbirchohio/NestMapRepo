# NestMap

NestMap is an intelligent AI-powered travel planning platform that transforms trip preparation into a dynamic, personalized experience through advanced location search, interactive planning tools, and innovative user engagement features.

![NestMap Demo](attached_assets/image_1747789143085.png)

## Features

- **Interactive Map Planning**: Plan your trip visually with an intuitive map interface
- **AI-Powered Assistant**: Get personalized recommendations for activities, restaurants, and more
- **Weather-Based Suggestions**: Receive activity recommendations based on weather forecasts
- **Budget Planning**: Get budget estimates and cost-saving tips for your trips
- **Collaborative Planning**: Share your trips with friends and family for collaborative editing
- **Activity Timeline**: Organize your day with a visual timeline of activities
- **Location Search**: Find points of interest with AI-enhanced location identification
- **Task Management**: Keep track of travel-related tasks with built-in to-do lists

## Getting Started

See the [Setup Guide](SETUP_GUIDE.md) for detailed instructions on getting NestMap running on your own environment.

### Prerequisites

- Node.js 16+
- PostgreSQL database or Supabase account
- OpenAI API key
- Mapbox API token

### Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your API keys
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`
5. Access the application at http://localhost:5000

## Technology Stack

NestMap is built with the following technologies:

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **Maps**: Mapbox GL JS
- **AI Integration**: OpenAI GPT-4
- **State Management**: React Query, React Context

## Documentation

- [Setup Guide](SETUP_GUIDE.md) - Instructions for setting up the application
- [Screenshots](docs/SCREENSHOTS.md) - Visual guide to the application's features
- [API Documentation](docs/API.md) - API endpoint documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [OpenAI](https://openai.com/) for providing the AI capabilities
- [Mapbox](https://www.mapbox.com/) for the mapping functionality
- [Supabase](https://supabase.com/) for authentication and database services
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components