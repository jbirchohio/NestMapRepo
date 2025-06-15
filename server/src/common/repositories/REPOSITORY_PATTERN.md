# Repository Pattern Architecture

## Overview

The repository pattern provides a standardized way to interact with data storage across the application. This implementation separates the data access logic from business logic, making the codebase more maintainable, testable, and modular.

> **Note**: This document describes the standardized repository pattern implementation for the NestMap application. All new features should follow this pattern, and existing features should be migrated to this pattern over time.

## Architecture

The repository pattern is implemented with the following components:

1. **Base Repository Interface** - Defines common CRUD operations that all repositories should implement
2. **Base Repository Implementation** - Provides default implementations for common operations
3. **Domain-Specific Repository Interfaces** - Extend the base interface with domain-specific operations
4. **Domain-Specific Repository Implementations** - Extend the base implementation and implement domain-specific interfaces
5. **Repository Module** - Registers all repositories in the dependency injection container

## Directory Structure

```
src/common/repositories/
├── base.repository.interface.ts    # Base repository interface
├── base.repository.ts              # Base repository implementation
├── repository.providers.ts         # Provider definitions for DI
├── repositories.module.ts          # Module for DI registration
├── index.ts                        # Export all repositories
├── REPOSITORY_PATTERN.md           # This documentation file
├── activity/                       # Activity repository
│   ├── activity.repository.interface.ts
│   └── activity.repository.ts
├── booking/                        # Booking repository
│   ├── booking.repository.interface.ts
│   └── booking.repository.ts
├── organization/                   # Organization repository
│   ├── organization.repository.interface.ts
│   └── organization.repository.ts
└── user/                           # User repository
    ├── user.repository.interface.ts
    └── user.repository.ts
```

## How to Use

### 1. Import the Repositories Module

To use repositories in your module, import the `RepositoriesModule`:

```typescript
import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../common/repositories';

@Module({
  imports: [RepositoriesModule],
  // ...
})
export class YourModule {}
```

### 2. Inject Repositories into Services

Inject repositories into your services using dependency injection:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { TripRepository } from '../common/repositories';

@Injectable()
export class YourService {
  constructor(
    @Inject('TripRepository')
    private readonly tripRepository: TripRepository,
  ) {}
  
  async someMethod() {
    const trips = await this.tripRepository.findAll();
    // ...
  }
}
```

### 3. Create a New Repository

To create a new repository:

1. Create an interface that extends `BaseRepository` with domain-specific methods
2. Create an implementation that extends `BaseRepositoryImpl` and implements your interface
3. Add a provider definition in `repository.providers.ts`
4. Update the exports in `index.ts`

Example:

```typescript
// booking.repository.interface.ts
import { BaseRepository } from '../base.repository.interface';
import { Booking } from '../../../../db/schema';

export interface BookingRepository extends BaseRepository<Booking, string, CreateBookingDto, UpdateBookingDto> {
  findByUserId(userId: string): Promise<Booking[]>;
  // Add domain-specific methods
}

// booking.repository.ts
import { Injectable } from '@nestjs/common';
import { BaseRepositoryImpl } from '../base.repository';
import { BookingRepository } from './booking.repository.interface';
import { bookings } from '../../../../db/schema';

@Injectable()
export class BookingRepositoryImpl extends BaseRepositoryImpl<Booking, string, CreateBookingDto, UpdateBookingDto> implements BookingRepository {
  constructor() {
    super('Booking', bookings, bookings.id);
  }
  
  async findByUserId(userId: string): Promise<Booking[]> {
    // Implementation
  }
}
```

## Complete Feature Example

The booking feature demonstrates a complete implementation of the repository pattern:

### 1. Repository Interface and Implementation

```typescript
// booking.repository.interface.ts
export interface BookingRepository extends BaseRepository<Booking, string, CreateDTO, UpdateDTO> {
  findByUserId(userId: string): Promise<Booking[]>;
  findByTripId(tripId: string): Promise<Booking[]>;
  // Domain-specific methods...
}

// booking.repository.ts
@Injectable()
export class BookingRepositoryImpl extends BaseRepositoryImpl<Booking, string, CreateDTO, UpdateDTO> implements BookingRepository {
  constructor() {
    super('Booking', bookings, bookings.id);
  }
  
  async findByUserId(userId: string): Promise<Booking[]> {
    // Implementation...
  }
  
  // Other method implementations...
}
```

### 2. Service Using Repository

```typescript
// booking.service.ts
@Injectable()
export class BookingService {
  constructor(
    @Inject('BookingRepository')
    private readonly bookingRepository: BookingRepository,
  ) {}
  
  async getBookingById(id: string): Promise<Booking | null> {
    return this.bookingRepository.findById(id);
  }
  
  // Other service methods...
}
```

### 3. Controller Using Service

```typescript
// booking.controller.ts
@Controller('bookings')
export class BookingController {
  constructor(
    @Inject('BookingService')
    private readonly bookingService: BookingService,
  ) {}
  
  @Get(':id')
  async getBookingById(@Param('id') id: string): Promise<Booking | null> {
    return this.bookingService.getBookingById(id);
  }
  
  // Other controller methods...
}
```

### 4. Module Registration

```typescript
// booking.module.ts
@Module({
  imports: [RepositoriesModule],
  controllers: [BookingController],
  providers: [
    {
      provide: 'BookingService',
      useClass: BookingService,
    },
  ],
  exports: ['BookingService'],
})
export class BookingModule {}
```

## Benefits

- **Standardization** - Consistent data access patterns across the application
- **Separation of Concerns** - Data access logic is separated from business logic
- **Testability** - Repositories can be easily mocked for testing
- **Maintainability** - Changes to data access are isolated to repositories
- **Modularity** - Repositories can be swapped out without affecting business logic
- **Scalability** - New features can be added without modifying existing code

## Best Practices

1. Always extend the base repository interface and implementation
2. Keep repository methods focused on data access, not business logic
3. Use descriptive method names that reflect the domain
4. Handle errors consistently within repositories
5. Log important operations for debugging and monitoring
6. Use proper typing for all repository methods and parameters
7. Register repositories in the central RepositoriesModule
8. Use dependency injection to access repositories in services
9. Follow the layered architecture: Controller → Service → Repository
10. Write unit tests for repositories using mocked database connections
