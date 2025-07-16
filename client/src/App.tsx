import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';

import { WhiteLabelProvider } from '@/contexts/WhiteLabelContext';
import { AuthProvider } from '@/providers/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Import pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import TestHome from '@/pages/TestHome';

// Loading component for Suspense fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <LoadingSpinner size="lg" />
  </div>
);

// Main App Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <WhiteLabelProvider>
              <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path="/" element={<MainLayout><Home /></MainLayout>} />
                    <Route path="/test" element={<MainLayout><TestHome /></MainLayout>} />
                    <Route path="/login" element={<MainLayout hideNav><Login /></MainLayout>} />
                    <Route path="/signup" element={<MainLayout hideNav><Signup /></MainLayout>} />
                    <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                    {/* Add more routes as needed */}
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <Toaster />
              <ReactQueryDevtools initialIsOpen={false} />
            </WhiteLabelProvider>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
