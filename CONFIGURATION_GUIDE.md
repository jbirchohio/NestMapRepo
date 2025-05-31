# NestMap Configuration Guide

This guide covers how to configure NestMap for white-label deployment and customize branding, server settings, and external integrations.

## Environment Configuration

Copy `.env.example` to `.env` and configure the following sections:

### Server Configuration
```env
PORT=5000                    # Server port
HOST=0.0.0.0                # Server host
BASE_URL=http://localhost:5000  # Base URL for the application
SESSION_SECRET=your-secure-session-secret-here  # Session encryption key
CORS_ORIGIN=*               # CORS origin settings
```

### App Branding (White-Label Configuration)
```env
APP_NAME=NestMap            # Application name displayed in UI
PRIMARY_COLOR=#3B82F6       # Primary brand color (blue)
SECONDARY_COLOR=#64748B     # Secondary color (gray)
ACCENT_COLOR=#10B981        # Accent color (green)
COMPANY_URL=yourcompany.com # Company website domain
SUPPORT_EMAIL=support@yourcompany.com  # Support contact email
LOGO_URL=                   # Custom logo URL (optional)
```

### External Services

#### Required Services
- **OpenAI**: For AI-powered trip generation and location search
- **Mapbox**: For map visualization and location services
- **Supabase**: For authentication and data storage

#### Optional Services
- **Amadeus API**: For real flight and hotel booking data
- **OpenWeatherMap**: For weather information
- **Google/Microsoft OAuth**: For social authentication

## White-Label Deployment

### Organization-Level Branding

1. **Database Configuration**: Organizations can have custom branding stored in the database
2. **Domain-Based Branding**: The `/api/branding` endpoint returns different configurations based on the requesting domain
3. **Environment Overrides**: Environment variables provide default branding that applies when no organization-specific branding exists

### Branding API Response
```json
{
  "appName": "NestMap",
  "primaryColor": "#3B82F6",
  "secondaryColor": "#64748B", 
  "accentColor": "#10B981",
  "logoUrl": null,
  "companyUrl": "yourcompany.com",
  "supportEmail": "support@example.com",
  "isWhiteLabel": false
}
```

## Analytics Configuration

The analytics system automatically scales demo data based on:
- **Organization Size**: Employee count affects trip volume
- **User Role Type**: Corporate vs agency users see different data patterns
- **Real Data Integration**: When available, real user data is prioritized over demo data

## Travel Provider Configuration

### Flight Search
- **Amadeus API**: Primary provider for real flight data
- **AI Fallback**: When Amadeus is unavailable, AI generates realistic flight suggestions
- **Booking URLs**: Configurable through environment variables

### Hotel Search  
- **Booking.com Integration**: Planned for real hotel data
- **AI Suggestions**: Current fallback for hotel recommendations
- **Custom Providers**: Easily extensible for additional booking providers

## Security Configuration

### Session Management
```env
SESSION_SECRET=your-secure-session-secret-here
```

### Database Security
- Use strong database credentials
- Enable SSL for production deployments
- Regular backup procedures recommended

## Development vs Production

### Development
```env
NODE_ENV=development
BASE_URL=http://localhost:5000
```

### Production
```env
NODE_ENV=production
BASE_URL=https://yourdomain.com
```

## Troubleshooting

### Common Issues

1. **Database Connection**: Verify DATABASE_URL is correct
2. **Missing API Keys**: Check required environment variables are set
3. **CORS Issues**: Adjust CORS_ORIGIN for your domain
4. **Session Errors**: Ensure SESSION_SECRET is set and sufficiently complex

### API Key Requirements

**Essential (App won't start without these):**
- DATABASE_URL
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

**Important (Features disabled without these):**
- OPENAI_API_KEY (AI features)
- MAPBOX_TOKEN (Map visualization)

**Optional (Enhanced features):**
- AMADEUS_API_KEY (Real flight data)
- OPENWEATHERMAP_API_KEY (Weather data)
- Google/Microsoft OAuth credentials

## White-Label Customization Examples

### Basic Branding
```env
APP_NAME=YourCompany Travel
PRIMARY_COLOR=#FF6B35
COMPANY_URL=yourcompany.com
SUPPORT_EMAIL=travel@yourcompany.com
```

### Enterprise Deployment
```env
APP_NAME=Enterprise Travel Portal
PRIMARY_COLOR=#1E3A8A
SECONDARY_COLOR=#374151
ACCENT_COLOR=#059669
LOGO_URL=https://yourcompany.com/logo.png
```

This configuration system ensures NestMap can be easily customized for different organizations while maintaining a consistent user experience.