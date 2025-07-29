#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper function to ensure directory exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
  }
}

// Helper function to write file
async function writeFile(filePath, content) {
  try {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Created: ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

// Step 3.1: Create tRPC React client
async function createTRPCClient() {
  console.log('\n📁 Creating tRPC client setup...');

  const trpcClientContent = `import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../server/src/trpc/routers';

export const trpc = createTRPCReact<AppRouter>();
`;

  await writeFile('client/src/lib/trpc.ts', trpcClientContent);
}

// Step 3.2: Update main.tsx with providers
async function createProviderSetup() {
  console.log('\n📝 Creating provider setup instructions...');

  const providerSetupContent = `// Add these imports to main.tsx
import { httpBatchLink } from '@trpc/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './lib/trpc';
import superjson from 'superjson';

// Create query client and tRPC client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpBatchLink({
      url: '/trpc',
      headers() {
        const token = localStorage.getItem('token');
        return token ? { authorization: \`Bearer \${token}\` } : {};
      },
    }),
  ],
});

// Wrap your App component with providers
<trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
</trpc.Provider>
`;

  console.log('⚠️  Manual update required for main.tsx:');
  console.log(providerSetupContent);
}

// Step 3.3: Create conversion helpers
async function createConversionHelpers() {
  console.log('\n🔧 Creating client conversion helpers...');

  // Hook conversion example
  const useTripsHookContent = `import { trpc } from '../lib/trpc';

export function useTrips(options?: {
  limit?: number;
  status?: 'DRAFT' | 'PLANNED' | 'ACTIVE' | 'COMPLETED';
}) {
  const { data, isLoading, error, refetch } = trpc.trips.list.useQuery({
    limit: options?.limit || 10,
    status: options?.status,
  });

  return {
    trips: data?.items || [],
    isLoading,
    error,
    refetch,
    hasMore: !!data?.nextCursor,
  };
}

export function useTrip(tripId: string) {
  return trpc.trips.getById.useQuery(tripId, {
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const utils = trpc.useContext();
  
  return trpc.trips.create.useMutation({
    onSuccess: () => {
      utils.trips.list.invalidate();
    },
  });
}

export function useUpdateTrip() {
  const utils = trpc.useContext();
  
  return trpc.trips.update.useMutation({
    onSuccess: (data) => {
      utils.trips.getById.invalidate(data.id);
      utils.trips.list.invalidate();
    },
  });
}

export function useDeleteTrip() {
  const utils = trpc.useContext();
  
  return trpc.trips.delete.useMutation({
    onSuccess: () => {
      utils.trips.list.invalidate();
    },
  });
}
`;

  await writeFile('client/src/hooks/useTrips.trpc.ts', useTripsHookContent);

  // Auth hook conversion
  const useAuthHookContent = `import { trpc } from '../lib/trpc';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';

interface AuthState {
  user: any | null;
  token: string | null;
  setAuth: (user: any, token: string) => void;
  clearAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));

export function useAuth() {
  const navigate = useNavigate();
  const { user, token, setAuth, clearAuth } = useAuthStore();
  const utils = trpc.useContext();

  const login = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate('/dashboard');
    },
  });

  const register = trpc.auth.register.useMutation({
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      navigate('/onboarding');
    },
  });

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      clearAuth();
      utils.invalidate();
      navigate('/login');
    },
  });

  const { data: currentUser } = trpc.auth.me.useQuery(undefined, {
    enabled: !!token,
  });

  return {
    user: currentUser || user,
    token,
    isAuthenticated: !!token,
    login: login.mutate,
    register: register.mutate,
    logout: logout.mutate,
    isLoading: login.isLoading || register.isLoading,
  };
}
`;

  await writeFile('client/src/hooks/useAuth.trpc.ts', useAuthHookContent);

  // Component conversion example
  const dashboardComponentContent = `import React from 'react';
import { trpc } from '../lib/trpc';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

export function Dashboard() {
  const { data: trips, isLoading, error } = trpc.trips.list.useQuery({
    limit: 10,
    status: 'ACTIVE',
  });

  const { data: analytics } = trpc.analytics.placeholder.useQuery();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error.message} />;

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <div className="trips-section">
        <h2>Active Trips</h2>
        {trips?.items.map((trip) => (
          <div key={trip.id} className="trip-card">
            <h3>{trip.name}</h3>
            <p>{trip.destination}</p>
            <span>{new Date(trip.startDate).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
`;

  await writeFile('client/src/pages/Dashboard.trpc.tsx', dashboardComponentContent);
}

// Create API migration script
async function createAPIMigrationScript() {
  console.log('\n🔄 Creating API call migration script...');

  const migrationScriptContent = `#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

// Patterns to identify API calls
const apiPatterns = [
  /fetch\\s*\\(['"\`]\/api\\/([^'"\`]+)['"\`]/g,
  /apiClient\\.(get|post|put|delete|patch)\\s*\\(['"\`]([^'"\`]+)['"\`]/g,
  /axios\\.(get|post|put|delete|patch)\\s*\\(['"\`]\/api\\/([^'"\`]+)['"\`]/g,
];

// Map API endpoints to tRPC procedures
const endpointMap = {
  'auth/login': 'auth.login',
  'auth/register': 'auth.register',
  'auth/logout': 'auth.logout',
  'auth/me': 'auth.me',
  'users/profile': 'user.getProfile',
  'users/preferences': 'user.getPreferences',
  'trips': 'trips.list',
  'trips/create': 'trips.create',
  'bookings': 'bookings.list',
  'expenses': 'expenses.list',
  'analytics': 'analytics.get',
  'notifications': 'notifications.list',
};

// Convert fetch call to tRPC
function convertFetchToTRPC(fetchCode, endpoint, method = 'GET') {
  const trpcProcedure = endpointMap[endpoint] || \`api.\${endpoint.replace(/\\//g, '.')}\`;
  const [router, procedure] = trpcProcedure.split('.');
  
  if (method === 'GET') {
    return \`trpc.\${router}.\${procedure}.useQuery()\`;
  } else {
    return \`trpc.\${router}.\${procedure}.useMutation()\`;
  }
}

// Process file and convert API calls
async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let modified = false;
    
    // Check if file has API calls
    if (!content.includes('fetch') && !content.includes('apiClient') && !content.includes('axios')) {
      return false;
    }
    
    // Add tRPC import if not present
    if (!content.includes("from '../lib/trpc'") && !content.includes('from "../lib/trpc"')) {
      content = \`import { trpc } from '../lib/trpc';\\n\${content}\`;
      modified = true;
    }
    
    // Replace fetch calls
    content = content.replace(/fetch\\s*\\(['"\`]\/api\\/([^'"\`]+)['"\`].*?\\)\\s*\\.then/g, (match, endpoint) => {
      modified = true;
      const trpcCall = convertFetchToTRPC(match, endpoint);
      console.log(\`  Converting: fetch('/api/\${endpoint}') -> \${trpcCall}\`);
      return trpcCall;
    });
    
    // Replace apiClient calls
    content = content.replace(/apiClient\\.(get|post|put|delete|patch)\\s*\\(['"\`]([^'"\`]+)['"\`]/g, (match, method, endpoint) => {
      modified = true;
      const trpcCall = convertFetchToTRPC(match, endpoint, method.toUpperCase());
      console.log(\`  Converting: apiClient.\${method}('\${endpoint}') -> \${trpcCall}\`);
      return trpcCall;
    });
    
    if (modified) {
      await fs.writeFile(filePath, content);
      console.log(\`✅ Converted: \${filePath}\`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(\`Error processing \${filePath}:\`, error);
    return false;
  }
}

// Recursively process directory
async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let convertedCount = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      convertedCount += await processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      if (await processFile(fullPath)) {
        convertedCount++;
      }
    }
  }
  
  return convertedCount;
}

// Main execution
async function main() {
  console.log('🔄 Starting API call migration...\\n');
  
  const clientDir = 'client/src';
  const convertedCount = await processDirectory(clientDir);
  
  console.log(\`\\n✨ Migration complete! Converted \${convertedCount} files.\`);
  console.log('\\n⚠️  Please review the changes and test thoroughly.');
}

main().catch(console.error);
\`;

  await writeFile('scripts/migrate-api-calls.js', migrationScriptContent);
}