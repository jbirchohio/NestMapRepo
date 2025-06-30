---
trigger: always_on
---

# TypeScript Configuration and Import/Export Patterns

## Table of Contents
- [Project Structure](#project-structure)
- [TypeScript Configuration](#typescript-configuration)
- [Import/Export Patterns](#importexport-patterns)
- [Best Practices](#best-practices)
- [Common Issues and Solutions](#common-issues-and-solutions)
- [Migration Guide](#migration-guide)

## Project Structure

```
project-root/
├── client/               # Frontend application
│   └── src/
│       ├── types/       # Client-specific types (minimal)
│       └── ...
├── server/               # Backend application
│   └── src/
│       └── types/       # Server-specific types (minimal)
└── shared/               # Shared code between client and server
    └── src/
        ├── types/       # Shared type definitions
        │   ├── auth/     # Authentication types
        │   ├── api/      # API contract types
        │   └── ...
        └── api/        # Shared API client code
```

## TypeScript Configuration

### Base Configuration (`tsconfig.base.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM"],
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### Client Configuration (`client/tsconfig.json`)
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": {
      "@client/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"],
      "@shared-types/*": ["../shared/src/types/*"]
    },
    "types": ["vite/client"],
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

### Server Configuration (`server/tsconfig.json`)
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@server/*": ["./src/*"],
      "@db/*": ["./db/*"],
      "@shared/*": ["../shared/src/*"]
    },
    "types": ["node", "jest"]
  },
  "include": ["src", "db"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "references": [{ "path": "../shared" }]
}
```

### Shared Configuration (`shared/tsconfig.json`)
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./src/*"]
    },
    "composite": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Import/Export Patterns

### 1. Importing Shared Code

```typescript
// Good - Using path aliases
import { User } from '@shared/types/auth/user';
import { apiClient } from '@shared/api';

// Avoid - Relative paths
import { User } from '../../../shared/src/types/auth/user';
```

### 2. Exporting Types

In `shared/src/types/auth/user.ts`:
```typescript
export interface User {
  id: string;
  email: string;
  role: UserRole;
  // ...
}

export type UserProfile = {
  // ...
};
```

In `shared/src/types/auth/index.ts` (barrel file):
```typescript
export * from './user';
export * from './jwt';
// ...
```

### 3. Client-Specific Types

In `client/src/types/` (only when absolutely necessary):
```typescript
import { User } from '@shared/types/auth/user';

export interface ClientUser extends User {
  // Client-specific extensions only
  preferences?: UserPreferences;
}
```

## Best Practices

1. **Type Organization**
   - Keep shared types in `shared/src/types`
   - Group related types in feature-based directories
   - Use barrel files (`index.ts`) for clean imports

2. **Import Paths**
   - Always use `@shared/*` for shared code
   - Use `@client/*` for client-specific code
   - Use `@server/*` for server-specific code

3. **Type Reuse**
   - Prefer extending shared types over duplicating them
   - Use utility types (`Pick`, `Omit`, `Partial`) when needed
   - Avoid `any` - use `unknown` or proper types

4. **Build Process**
   - Use `composite: true` for project references
   - Enable `declarationMap` for better IDE support
   - Use `incremental: true` for faster builds

## Common Issues and Solutions

### 1. Module Not Found
**Issue**: `Cannot find module '@shared/types/...'`
**Solution**:
- Verify path aliases in `tsconfig.json`
- Ensure the file exists in the shared package
- Run `tsc --build` to rebuild project references

### 2. Type Duplication
**Issue**: Duplicate type definitions between client and shared
**Solution**:
- Move shared types to `shared/src/types`
- Import from shared instead of redefining
- Use module augmentation if extending types is necessary

### 3. Build Performance
**Issue**: Slow TypeScript compilation
**Solution**:
- Enable `incremental: true`
- Use project references
- Exclude `node_modules` and `dist` directories

## Migration Guide

### Moving to New Import System

1. **Update `tsconfig.json` files**
   - Apply the configurations provided above
   - Ensure all path aliases are consistent

2. **Update Imports**
   - Replace relative paths with `@shared/*`
   - Update any build tooling (webpack, vite, etc.)

3. **Verify Build**
   - Run `tsc --build` in each package
   - Fix any type errors
   - Test both development and production builds

4. **Update Documentation**
   - Document the new import patterns
   - Update any onboarding materials

## Troubleshooting

### TypeScript Cannot Find Module
1. Check if the file exists in the expected location
2. Verify path aliases in `tsconfig.json`
3. Restart TypeScript server in your IDE

### Build Failures
1. Clean build artifacts: `rm -rf dist node_modules/.cache`
2. Reinstall dependencies: `npm ci`
3. Rebuild: `npm run build`

### IDE Issues
1. Clear TypeScript cache
2. Restart IDE
3. Ensure workspace version of TypeScript is being used