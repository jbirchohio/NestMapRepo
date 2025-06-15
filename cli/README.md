# NestMap CLI

A comprehensive command-line interface for NestMap development workflow automation.

## Installation

```bash
# Install globally
npm install -g ./cli

# Or link for development
cd cli
npm link
```

## Usage

```bash
nestmap [command] [options]
```

## Available Commands

### Development

```bash
# Start development server with hot reload
nestmap dev

# Start only client
nestmap dev --client-only

# Start only server
nestmap dev --server-only

# Start on specific port
nestmap dev --port 3000
```

### Migrations

```bash
# Run migrations up (default)
nestmap migrate

# Roll back migrations
nestmap migrate --down

# Migrate to specific version
nestmap migrate --to 20230101120000

# Create a new migration
nestmap migration:create add_user_roles
```

### Testing

```bash
# Run all tests
nestmap test

# Run tests in watch mode
nestmap test --watch

# Generate test coverage
nestmap test --coverage

# Run only unit tests
nestmap test --unit

# Run only e2e tests
nestmap test --e2e
```

### Code Generation

```bash
# Generate a React component
nestmap generate --component MyComponent

# Generate a service
nestmap generate --service User

# Generate a model
nestmap generate --model Product

# Generate an API route
nestmap generate --route Order

# Generate a controller
nestmap generate --controller Customer
```

### Project Setup

```bash
# Setup everything
nestmap setup

# Setup only database
nestmap setup --db

# Setup only Redis
nestmap setup --redis

# Setup only environment variables
nestmap setup --env
```

### Deployment

```bash
# Deploy to staging (default)
nestmap deploy

# Deploy to production
nestmap deploy --env production

# Deploy using blue-green strategy
nestmap deploy --blue-green
```

### Database

```bash
# Seed database with sample data
nestmap db:seed

# Reset database before seeding
nestmap db:seed --reset

# Seed test database
nestmap db:seed --env test
```

### Environment

```bash
# Check environment configuration
nestmap check-env
```

### Organization Management

```bash
# Create a new organization
nestmap org:create "My Organization"

# Create with admin user
nestmap org:create "My Organization" --admin admin@example.com
```

## Development

To contribute to the CLI tool:

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the CLI: `npm run build`
4. Link for local development: `npm link`

## License

This project is proprietary and confidential.
