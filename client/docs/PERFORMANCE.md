# Performance Optimization Guide

This guide covers best practices and patterns for optimizing React application performance in the NestMap frontend.

## Table of Contents

1. [Memoization](#memoization)
2. [Code Splitting](#code-splitting)
3. [Performance Hooks](#performance-hooks)
4. [Rendering Optimization](#rendering-optimization)
5. [Network Optimization](#network-optimization)
6. [Performance Monitoring](#performance-monitoring)

## Memoization

### When to Use `React.memo`

Use `React.memo` for components that:
- Re-render often with the same props
- Are expensive to render
- Are pure (same props in = same output)
- Don't need to re-render when parent re-renders

```tsx
import { memo } from 'react';

interface UserCardProps {
  user: User;
  onSave: (user: User) => void;
}

// Basic memoization
const UserCard = memo(function UserCard({ user, onSave }: UserCardProps) {
  return (
    <div>
      <h3>{user.name}</h3>
      <button onClick={() => onSave(user)}>Save</button>
    </div>
  );
});

// With custom comparison function
const UserCardWithCustomCompare = memo(
  function UserCard({ user, onSave }: UserCardProps) {
    // Component implementation
  },
  (prevProps, nextProps) => {
    // Only re-render if user ID or name changes
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.name === nextProps.user.name
    );
  }
);
```

### `useMemo` for Expensive Calculations

Use `useMemo` to avoid recalculating expensive values on every render:

```tsx
import { useMemo } from 'react';

function UserList({ users, searchQuery }) {
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  return (
    <ul>
      {filteredUsers.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### `useCallback` for Function Stability

Use `useCallback` to maintain stable function references between renders:

```tsx
import { useCallback } from 'react';

function UserForm({ onSubmit }) {
  const [name, setName] = useState('');
  
  // This function is recreated on every render without useCallback
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit({ name });
  }, [name, onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Code Splitting

### Route-based Code Splitting

Use React.lazy for route-based code splitting:

```tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <Router>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
```

### Component-level Code Splitting

For large components that aren't needed immediately:

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function ParentComponent() {
  const [showHeavy, setShowHeavy] = useState(false);

  return (
    <div>
      <button onClick={() => setShowHeavy(true)}>Show Heavy Component</button>
      {showHeavy && (
        <Suspense fallback={<div>Loading component...</div>}>
          <HeavyComponent />
        </Suspense>
      )}
    </div>
  );
}
```

## Performance Hooks

### `useMemoizedValue`

For expensive calculations with complex dependencies:

```tsx
import { useMemoizedValue } from '../utils/performance';

function ComplexComponent({ data, filters }) {
  const processedData = useMemoizedValue(
    () => {
      // Expensive computation
      return data.filter(/* ... */).map(/* ... */);
    },
    [data, filters],
    { maxSize: 10 }
  );
}
```

### `useDebounce` and `useThrottle`

For optimizing frequent events like window resizing or typing:

```tsx
import { useDebounce } from '../utils/performance';

function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');
  
  // Debounce the search to avoid too many API calls
  const debouncedSearch = useDebounce(
    (searchQuery) => onSearch(searchQuery),
    300, // 300ms delay
    [] // Dependencies
  );

  const handleChange = (e) => {
    const { value } = e.target;
    setQuery(value);
    debouncedSearch(value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

## Rendering Optimization

### Virtualized Lists

For long lists, use a virtualized list component:

```tsx
import { FixedSizeList as List } from 'react-window';

function BigList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );

  return (
    <List
      height={500}
      itemCount={items.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

### Avoid Inline Function Definitions in JSX

```tsx
// Bad - creates new function on every render
<button onClick={() => handleClick(item.id)}>Click me</button>
// Good - stable function reference
<button onClick={handleClick}>Click me</button>
```

## Network Optimization

### API Request Deduplication

Use a request deduplication library or implement your own:

```ts
const pendingRequests = new Map();

export async function fetchWithDedupe(url, config) {
  const requestKey = `${url}-${JSON.stringify(config)}`;
  
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  const promise = apiClient.get(url, config)
    .finally(() => {
      pendingRequests.delete(requestKey);
    });
  
  pendingRequests.set(requestKey, promise);
  return promise;
}
```

## Performance Monitoring

### React DevTools Profiler

Use the React DevTools Profiler to identify performance bottlenecks:

1. Open Chrome DevTools
2. Go to the "Profiler" tab
3. Click the record button and interact with your app
4. Stop recording and analyze the results

### Performance API

Use the Performance API for custom metrics:

```ts
function measureInteraction(callback, interactionName) {
  const start = performance.now();
  
  // Execute the interaction
  const result = callback();
  
  // Measure duration
  const duration = performance.now() - start;
  
  // Log or send to analytics
  console.log(`${interactionName} took ${duration}ms`);
  
  return result;
}

// Usage
measureInteraction(() => {
  // Some expensive operation
}, 'Filtering items');
```

## Best Practices

1. **Profile First**: Always profile before optimizing
2. **Measure Impact**: Verify optimizations with measurements
3. **Avoid Premature Optimization**: Don't optimize code that doesn't need it
4. **Use Production Builds**: Test performance with production builds
5. **Monitor Bundle Size**: Keep an eye on your bundle size
6. **Lazy Load Non-Critical Assets**: Load fonts, images, and other assets lazily
7. **Optimize Images**: Compress and serve appropriately sized images
8. **Use Web Workers**: Offload heavy computations to web workers

## Tools

- [React DevTools](https://reactjs.org/blog/2019/08/15/new-react-devtools.html)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Web Vitals](https://web.dev/vitals/)
- [Why Did You Render](https://github.com/welldone-software/why-did-you-render)
- [React Query DevTools](https://react-query.tanstack.com/devtools)
