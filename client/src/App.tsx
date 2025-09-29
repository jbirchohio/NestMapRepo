import React, { useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from "@/components/notifications/NotificationCenter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/JWTAuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import { analytics } from "@/lib/analytics";
import MainNavigationConsumer from "@/components/MainNavigationConsumer";
import PWAUpdatePrompt from "@/components/PWAUpdatePrompt";
import SimpleFooter from "@/components/SimpleFooter";
import HomeConsumerRedesigned from "@/pages/HomeConsumerRedesigned";
import TripPlanner from "@/pages/TripPlanner";
const SimpleShare = lazy(() => import("@/pages/SimpleShare"));
const TripOptimizer = lazy(() => import("@/pages/TripOptimizer"));
const ProfileSettings = lazy(() => import("@/pages/ProfileSettings"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const AITripGeneratorPage = lazy(() => import("@/pages/AITripGenerator"));
const ContactPage = lazy(() => import("@/pages/Contact").then(m => ({ default: m.ContactPage })));
const PrivacyPage = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import("@/pages/Terms").then(m => ({ default: m.TermsPage })));
const HelpPage = lazy(() => import("@/pages/Help").then(m => ({ default: m.HelpPage })));
const DestinationGuide = lazy(() => import("@/pages/DestinationGuide"));
import NotFound from "@/pages/not-found";
import Explore from "@/pages/Explore";
const TemplateMarketplace = lazy(() => import("@/pages/TemplateMarketplace"));
const TemplateDetails = lazy(() => import("@/pages/TemplateDetails"));
const CreateTemplate = lazy(() => import("@/pages/CreateTemplate"));
const PublicTemplate = lazy(() => import("@/pages/PublicTemplate"));
const CreatorDashboard = lazy(() => import("@/pages/CreatorDashboard"));
const TemplateAnalytics = lazy(() => import("@/pages/TemplateAnalytics"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const YearInTravelPage = lazy(() => import("@/pages/YearInTravelPage"));

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
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
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
          <Route path="/year-in-travel" component={YearInTravelPage} />

          {/* Creator Economy */}
          <Route path="/marketplace" component={TemplateMarketplace} />
          <Route path="/templates/create" component={CreateTemplate} />
          <Route path="/templates/:slug" component={TemplateDetails} />
          <Route path="/t/:shareCode" component={PublicTemplate} />
          <Route path="/creator/dashboard" component={CreatorDashboard} />
          <Route path="/creator/analytics/:templateId" component={TemplateAnalytics} />

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
        </Suspense>
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
            <NotificationProvider>
              <Toaster />
              <PWAUpdatePrompt />
              <Router />
            </NotificationProvider>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
