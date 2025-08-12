import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/JWTAuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { analytics } from "@/lib/analytics";
import MainNavigationConsumer from "@/components/MainNavigationConsumer";
import SimpleFooter from "@/components/SimpleFooter";
import HomeConsumerRedesigned from "@/pages/HomeConsumerRedesigned";
import TripPlanner from "@/pages/TripPlanner";
import SimpleShare from "@/pages/SimpleShare";
import TripOptimizer from "@/pages/TripOptimizer";
import ProfileSettings from "@/pages/ProfileSettings";
import HelpCenter from "@/pages/HelpCenter";
import AITripGeneratorPage from "@/pages/AITripGenerator";
import { ContactPage } from "@/pages/Contact";
import { PrivacyPage } from "@/pages/Privacy";
import { TermsPage } from "@/pages/Terms";
import { HelpPage } from "@/pages/Help";
import DestinationGuide from "@/pages/DestinationGuide";
import NotFound from "@/pages/not-found";
import Explore from "@/pages/Explore";
import TemplateMarketplace from "@/pages/TemplateMarketplace";
import TemplateDetails from "@/pages/TemplateDetails";
import CreateTemplate from "@/pages/CreateTemplate";
import PublicTemplate from "@/pages/PublicTemplate";
import CreatorDashboard from "@/pages/CreatorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

// Lazy load the Destinations page
const Destinations = lazy(() => import("@/pages/Destinations"));

function NavigationWrapper() {
  const { user } = useAuth();
  const [location] = useLocation();

  const isAuthPage = location === '/login' || location === '/signup';

  if (!isAuthPage) {
    return <MainNavigationConsumer />;
  }
  return null;
}

function HomePage() {
  const { user } = useAuth();
  // Show Explore page for logged-out users, dashboard for logged-in
  return user ? <HomeConsumerRedesigned /> : <Explore />;
}

function LoginRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Use history API to update URL without reload
    window.history.pushState({}, '', '/?auth=login');
    setLocation('/');
  }, [setLocation]);

  return <Explore />;
}

function SignupRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Use history API to update URL without reload
    window.history.pushState({}, '', '/?auth=signup');
    setLocation('/');
  }, [setLocation]);

  return <Explore />;
}

function Router() {
  const [location] = useLocation();

  // Track page views
  useEffect(() => {
    analytics.trackPageView(location);
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <NavigationWrapper />
      <main className="flex-1">
        <Switch>
          {/* Core consumer routes */}
          <Route path="/" component={HomePage} />
          <Route path="/login" component={LoginRedirect} />
          <Route path="/signup" component={SignupRedirect} />
          <Route path="/explore" component={Explore} />
          <Route path="/trip/:id" component={TripPlanner} />
          <Route path="/trip-planner/:id" component={TripPlanner} />
          <Route path="/trip-planner" component={TripPlanner} />
          <Route path="/share/:shareCode" component={SimpleShare} />

          {/* Travel features */}
          <Route path="/ai-generator" component={AITripGeneratorPage} />
          <Route path="/optimizer" component={TripOptimizer} />

          {/* Creator Economy */}
          <Route path="/marketplace" component={TemplateMarketplace} />
          <Route path="/templates/create" component={CreateTemplate} />
          <Route path="/templates/:slug" component={TemplateDetails} />
          <Route path="/t/:shareCode" component={PublicTemplate} />
          <Route path="/creator/dashboard" component={CreatorDashboard} />

          {/* Admin */}
          <Route path="/admin" component={AdminDashboard} />

          {/* SEO Destination Pages */}
          <Route path="/destinations">
            {() => (
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
                <Destinations />
              </Suspense>
            )}
          </Route>
          <Route path="/destinations/:destination" component={DestinationGuide} />

          {/* User account */}
          <Route path="/profile" component={ProfileSettings} />
          <Route path="/help" component={HelpPage} />

          {/* Static Pages */}
          <Route path="/contact" component={ContactPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />

          {/* 404 */}
          <Route component={NotFound} />
        </Switch>
      </main>
      <SimpleFooter />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
