# Database Schema Documentation

## Tables

### Users (`users`)
- **Description**: Stores user account information and authentication details
- **Relationships**:
  - One-to-Many with `trips` (user creates trips)
  - Many-to-Many with `organizations` (through `organization_members`)
  - One-to-Many with `activities` (user creates activities)
  - One-to-Many with `bookings` (user makes bookings)
  - One-to-Many with `card_transactions` (user's transactions)

### Organizations (`organizations`)
- **Description**: Represents companies or groups using the platform
- **Relationships**:
  - One-to-Many with `users` (through `organization_members`)
  - One-to-Many with `trips` (organization's trips)
  - One-to-Many with `corporate_cards` (organization's cards)
  - One-to-Many with `card_transactions` (organization's transactions)
  - One-to-Many with `invoices` (organization's billing)

### Trips (`trips`)
- **Description**: Represents travel itineraries
- **Relationships**:
  - Belongs to `users` (trip creator)
  - Belongs to `organizations` (trip organization)
  - One-to-Many with `activities` (trip activities)
  - One-to-Many with `trip_collaborators` (collaborators on trip)
  - One-to-Many with `trip_comments` (comments on trip)

### Activities (`activities`)
- **Description**: Individual events or items in a trip
- **Relationships**:
  - Belongs to `trips` (parent trip)
  - Belongs to `users` (creator)
  - One-to-Many with `bookings` (activity bookings)

### Bookings (`bookings`)
- **Description**: Reserved services (flights, hotels, etc.)
- **Relationships**:
  - Belongs to `users` (booked by)
  - Belongs to `trips` (associated trip)
  - Belongs to `activities` (optional parent activity)

### Corporate Cards (`corporate_cards`)
- **Description**: Company-issued payment cards
- **Relationships**:
  - Belongs to `organizations` (card issuer)
  - One-to-Many with `card_transactions` (card transactions)
  - One-to-Many with `cardholders` (card assignments)

### Card Transactions (`card_transactions`)
- **Description**: Transactions made with corporate cards
- **Relationships**:
  - Belongs to `corporate_cards` (source card)
  - Belongs to `users` (transaction owner)
  - Belongs to `organizations` (billing organization)
  - Optional relation to `expenses` (if expensed)

## Enums

### User Roles (`user_role`)
- `super_admin` - Full system access
- `admin` - Organization administrator
- `manager` - Team manager
- `member` - Regular user
- `guest` - Read-only access

### Organization Plans (`organization_plan`)
- `free` - Basic plan with limited features
- `pro` - Professional plan with additional features
- `enterprise` - Full-featured enterprise plan

## Indexes

### Users
- `users_locked_until_idx` - For checking account lock status
- `users_is_active_idx` - For filtering active users
- `users_active_composite_idx` - Composite index for common queries
- `users_org_composite_idx` - For organization-specific user queries

### Organizations
- `organizations_slug_idx` - For slug-based lookups
- `organizations_status_idx` - For filtering by status
- `organizations_created_at_idx` - For time-based queries

## Schema Management

### Migrations
- Database schema changes are managed through migration files in `/migrations`
- Each migration is timestamped and includes both `up` and `down` functions
- To create a new migration: `npx db-migrate create my-migration-name`

### Environment Variables
- `DB_HOST` - Database host
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password

## Backup and Recovery

### Backup
```bash
# Create database dump
pg_dump -h [host] -U [user] -d [database] > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
# Restore from dump
psql -h [host] -U [user] -d [database] < backup_file.sql
```
