import { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/providers/AuthProvider';
import { WhiteLabelProvider } from '@/contexts/WhiteLabelContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import OnboardingManager from '@/components/onboarding/OnboardingManager';

// Import pages
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import MainLayout from '@/layouts/MainLayout';

// Import Phase 1-3 Components
import VoiceAssistant from '@/pages/VoiceAssistant';
import EnterpriseIntegrationDashboard from '@/components/EnterpriseIntegrationDashboard';
import CustomReportBuilder from '@/components/CustomReportBuilder';
import SmartCityDashboard from '@/components/SmartCityDashboard';
import PlatformMarketplace from '@/components/PlatformMarketplace';
import AutonomousVehicleBooking from '@/components/AutonomousVehicleBooking';
import AutomationWorkflowBuilder from '@/components/AutomationWorkflowBuilder';

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
        <OnboardingProvider>
          <TooltipProvider>
            <Router
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <WhiteLabelProvider>
                <ErrorBoundary>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route path="/" element={<MainLayout><Home /></MainLayout>} />
                    <Route path="/login" element={<MainLayout hideNav><Login /></MainLayout>} />
                    <Route path="/signup" element={<MainLayout hideNav><Signup /></MainLayout>} />
                    <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
                    
                    {/* Phase 1: Voice Interface & AI Features */}
                    <Route path="/voice-assistant" element={<MainLayout><VoiceAssistant /></MainLayout>} />
                    
                    {/* Phase 2: Enterprise Integration & Reporting */}
                    <Route path="/enterprise-integration" element={<MainLayout><EnterpriseIntegrationDashboard /></MainLayout>} />
                    <Route path="/custom-reports" element={<MainLayout><CustomReportBuilder /></MainLayout>} />
                    
                    {/* Phase 3: Smart City & Advanced Features */}
                    <Route path="/smart-city" element={<MainLayout><SmartCityDashboard /></MainLayout>} />
                    <Route path="/marketplace" element={<MainLayout><PlatformMarketplace /></MainLayout>} />
                    <Route path="/autonomous-vehicles" element={<MainLayout><AutonomousVehicleBooking /></MainLayout>} />
                    <Route path="/automation" element={<MainLayout><AutomationWorkflowBuilder /></MainLayout>} />
                  </Routes>
                </Suspense>
                <Toaster />
                <OnboardingManager />
              </ErrorBoundary>
            </WhiteLabelProvider>
          </Router>
        </TooltipProvider>
      </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
