import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/JWTAuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import MainNavigationConsumer from "@/components/MainNavigationConsumer";
import SimpleFooter from "@/components/SimpleFooter";
import HomeConsumerRedesigned from "@/pages/HomeConsumerRedesigned";
import TripPlanner from "@/pages/TripPlanner";
import SimpleShare from "@/pages/SimpleShare";
import Bookings from "@/pages/Bookings";
import TripOptimizer from "@/pages/TripOptimizer";
import ProfileSettings from "@/pages/ProfileSettings";
import HelpCenter from "@/pages/HelpCenter";
import AITripGeneratorPage from "@/pages/AITripGenerator";
import FlightSearchSimple from "@/pages/FlightSearchSimple";
import FlightBooking from "@/pages/FlightBooking";
import FlightResults from "@/pages/FlightResults";
import BookingConfirmation from "@/pages/BookingConfirmation";
import DestinationGuide from "@/pages/DestinationGuide";
import NotFound from "@/pages/not-found";
import Explore from "@/pages/Explore";

function NavigationWrapper() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const isAuthPage = location === '/login' || location === '/signup';
  
  if (!isAuthPage) {
    return <MainNavigationConsumer />;
  }
  return null;
}

function Router() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <NavigationWrapper />
      <main className="flex-1">
        <Switch>
          {/* Core consumer routes */}
          <Route path="/" component={HomeConsumerRedesigned} />
          <Route path="/login">
            {() => {
              window.location.href = '/?auth=login';
              return <HomeConsumerRedesigned />;
            }}
          </Route>
          <Route path="/signup">
            {() => {
              window.location.href = '/?auth=signup';
              return <HomeConsumerRedesigned />;
            }}
          </Route>
          <Route path="/explore" component={Explore} />
          <Route path="/trip/:id" component={TripPlanner} />
          <Route path="/trip-planner/:id" component={TripPlanner} />
          <Route path="/trip-planner" component={TripPlanner} />
          <Route path="/share/:shareCode" component={SimpleShare} />
          
          {/* Travel features */}
          <Route path="/flights" component={FlightSearchSimple} />
          <Route path="/flights/results" component={FlightResults} />
          <Route path="/flights/book/:offerId" component={FlightBooking} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/bookings/:bookingId" component={BookingConfirmation} />
          <Route path="/ai-generator" component={AITripGeneratorPage} />
          <Route path="/optimizer" component={TripOptimizer} />
          
          {/* SEO Destination Pages */}
          <Route path="/destinations/:destination" component={DestinationGuide} />
          <Route path="/hotels/:destination" component={DestinationGuide} />
          <Route path="/packages/:destination" component={DestinationGuide} />
          
          {/* User account */}
          <Route path="/profile" component={ProfileSettings} />
          <Route path="/help" component={HelpCenter} />
          
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
