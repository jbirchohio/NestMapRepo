# Storage Module

This module provides a clean, modular architecture for data storage in the NestMap application. It follows the Repository pattern to separate data access logic from business logic.

## Structure

```
storage/
├── implementations/    # Storage implementations (in-memory, database, etc.)
│   └── MemStorage.ts   # In-memory implementation for development/testing
├── repositories/        # Repository interfaces and implementations
│   └── TripTravelerRepository.ts
├── types/               # TypeScript types and interfaces
│   └── index.ts
├── index.ts             # Public API (barrel exports)
└── README.md           # This file
```

## Key Components

### 1. Repositories

Each entity has its own repository interface and implementation. Repositories handle all data access for a specific entity.

Example:
```typescript
interface ITripTravelerRepository {
  getTripTravelers(tripId: string): Promise<TripTraveler[]>;
  getTripTraveler(id: string): Promise<TripTraveler | undefined>;
  addTripTraveler(traveler: NewTripTraveler): Promise<TripTraveler>;
  updateTripTraveler(id: string, updates: Partial<NewTripTraveler>): Promise<TripTraveler | undefined>;
  removeTripTraveler(id: string): Promise<boolean>;
}
```

### 2. Storage Implementations

Different storage implementations (in-memory, database, etc.) that implement the `IStorage` interface.

### 3. Types

Shared TypeScript types and interfaces used throughout the storage module.

## Usage

### Importing

```typescript
// Import the default storage instance (configured in storage.ts)
import storage from '../storage';

// Or import specific types/interfaces
import { IStorage, TripTraveler } from '../storage';
```

### Adding a New Repository

1. Create a new repository interface in `types/index.ts`
2. Implement the repository in the `repositories/` directory
3. Update the `IStorage` interface to include the new repository methods
4. Update the storage implementations to use the new repository

## Best Practices

1. **Separation of Concerns**: Keep business logic out of repositories
2. **Immutability**: Always return new objects when updating data
3. **Error Handling**: Handle errors at the repository level
4. **Testing**: Write unit tests for all repository methods
5. **Documentation**: Document complex queries and business rules

## Future Improvements

- Add database storage implementation
- Implement caching layer
- Add transaction support
- Add query builder utilities
