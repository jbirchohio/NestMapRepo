# API Client & React Query Integration Guide

This guide explains how to use the API client and React Query integration in the application.

## Table of Contents
- [Overview](#overview)
- [API Client](#api-client)
  - [Basic Usage](#basic-usage)
  - [Making Requests](#making-requests)
  - [Error Handling](#error-handling)
- [React Query Integration](#react-query-integration)
  - [Query Hooks](#query-hooks)
  - [Mutation Hooks](#mutation-hooks)
  - [Optimistic Updates](#optimistic-updates)
- [Resource Hooks](#resource-hooks)
- [Best Practices](#best-practices)
- [Example: Todo List](#example-todo-list)

## Overview

The API client provides a type-safe way to interact with the backend API. It's built on top of `fetch` and includes:

- TypeScript support for all requests and responses
- Consistent error handling
- Request/response interceptors
- Support for query parameters and request configuration
- Integration with React Query for data fetching and caching

## API Client

The API client provides a type-safe way to interact with the backend API. It's built on top of `fetch` and includes:

- TypeScript support for all requests and responses using `@shared/schema` types
- Consistent error handling
- Request/response interceptors
- Support for query parameters and request configuration
- Integration with React Query for data fetching and caching

### Type Definitions

All API types are defined in the shared package and should be imported from `@shared/schema`:

```typescript
// Request/response types
import type { 
  CreateUserRequest, 
  UserResponse 
} from '@shared/schema/api/users';

// Query parameter types
import type { UserQueryParams } from '@shared/schema/types/query-params';
```

### Basic Usage

Import the `api` function from `@/lib/api`:

```typescript
import { api } from '@/lib/api';

// GET request
const todos = await api('/todos');

// POST request
const newTodo = await api('/todos', 'POST', { title: 'New Todo' });
```

### Making Requests

The `api` function accepts the following parameters:

```typescript
api<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  data?: unknown,
  config?: ApiConfig
): Promise<T>
```

### Error Handling

All API errors are instances of `ApiError` with the following properties:

- `message`: Error message
- `status`: HTTP status code
- `code`: Error code (if available)
- `details`: Additional error details

```typescript
try {
  await api('/protected-route');
} catch (error) {
  if (error.status === 401) {
    // Handle unauthorized
  }
  console.error('API Error:', error.message);
}
```

## React Query Integration

### Query Hooks

Use the `useQuery` hook to fetch data:

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

function TodoList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: () => api('/todos')
  });
  
  // ...
}
```

### Mutation Hooks

Use the `useMutation` hook to modify data:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

function AddTodo() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newTodo) => api('/todos', 'POST', newTodo),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });
  
  // ...
}
```

### Optimistic Updates

For a better user experience, implement optimistic updates:

```typescript
const mutation = useMutation({
  mutationFn: (updatedTodo) => 
    api(`/todos/${updatedTodo.id}`, 'PATCH', updatedTodo),
  
  // Optimistically update the cache
  onMutate: async (updatedTodo) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    
    // Snapshot the previous value
    const previousTodos = queryClient.getQueryData(['todos']);
    
    // Optimistically update the cache
    queryClient.setQueryData(['todos'], (old: Todo[] = []) =>
      old.map(todo =>
        todo.id === updatedTodo.id ? { ...todo, ...updatedTodo } : todo
      )
    );
    
    // Return a context with the previous value
    return { previousTodos };
  },
  
  // If the mutation fails, roll back to the previous value
  onError: (err, updatedTodo, context) => {
    queryClient.setQueryData(['todos'], context?.previousTodos);
  },
  
  // Always refetch after error or success
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

## Resource Hooks

For common CRUD operations, use the resource hooks:

```typescript
import { createResourceHooks } from '@/lib/api';

// Create typed hooks for a resource
const todoHooks = createResourceHooks<Todo>('todos');

// In your component
function TodoList() {
  // Get all todos
  const { data: todos } = todoHooks.useGetAll();
  
  // Create a new todo
  const { mutate: createTodo } = todoHooks.useCreate();
  
  // Update a todo
  const { mutate: updateTodo } = todoHooks.useUpdate();
  
  // Delete a todo
  const { mutate: deleteTodo } = todoHooks.useDelete();
  
  // ...
}
```

## Best Practices

1. **Type Safety**
   - Always use types from `@shared/schema` for API requests/responses
   - Define request/response types in the shared package
   - Use `import type` for type-only imports

2. **Error Handling**
   - Use the centralized error handling from `@shared/schema/errors`
   - Include proper error boundaries
   - Log errors consistently

3. **API Client**
   - Use the typed API client methods
   - Handle loading states appropriately
   - Cancel requests when components unmount

4. **React Query**
   - Use proper query keys
   - Implement proper cache invalidation
   - Handle optimistic updates

1. **Use Resource Hooks**
   - Prefer `createResourceHooks` for standard CRUD operations
   - Keeps your components clean and reduces boilerplate

2. **Handle Loading and Error States**
   - Always handle loading and error states in your components
   - Use React Error Boundaries for unhandled errors

3. **Cache Invalidation**
   - Invalidate queries after mutations to keep the UI in sync
   - Use `queryClient.invalidateQueries` or optimistic updates

4. **Type Safety**
   - Always define TypeScript types for your API responses
   - Use generics to ensure type safety

5. **Error Handling**
   - Handle API errors gracefully
   - Show user-friendly error messages
   - Log errors for debugging

## Example: Todo List

See the full example in `src/components/examples/TodoList.tsx` and `src/app/examples/page.tsx` for a complete implementation of a todo list with CRUD operations.
