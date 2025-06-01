import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WhiteLabelProvider } from "@/contexts/WhiteLabelContext";
import MainNavigation from "@/components/MainNavigation";
import Home from "@/pages/Home";
import TripPlanner from "@/pages/TripPlanner";
import SimpleShare from "@/pages/SimpleShare";
import Analytics from "@/pages/Analytics";
import Bookings from "@/pages/Bookings";
import TripOptimizer from "@/pages/TripOptimizer";
import Settings from "@/pages/Settings";
import TeamManagement from "@/components/TeamManagement";
import BillingDashboard from "@/components/BillingDashboard";
import ProposalCenter from "@/pages/ProposalCenter";
import AITripGeneratorPage from "@/pages/AITripGenerator";
import EnterpriseDashboard from "@/pages/EnterpriseDashboard";
import CorporateDashboard from "@/pages/CorporateDashboard";
import AgencyDashboard from "@/pages/AgencyDashboard";
import DemoModeSelector from "@/components/DemoModeSelector";
import Demo from "@/pages/Demo";
import ProfileSettings from "@/pages/ProfileSettings";
import HelpCenter from "@/pages/HelpCenter";
import CalendarSettings from "@/pages/CalendarSettings";
import WhiteLabelSettings from "@/components/WhiteLabelSettings";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <>
      <MainNavigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/trip/:id" component={TripPlanner} />
        <Route path="/trip-planner/:id" component={TripPlanner} />
        <Route path="/share/:shareCode" component={SimpleShare} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/ai-generator" component={AITripGeneratorPage} />
        <Route path="/optimizer" component={TripOptimizer} />
        <Route path="/settings" component={Settings} />
        <Route path="/team" component={TeamManagement} />
        <Route path="/billing" component={BillingDashboard} />
        <Route path="/proposals" component={ProposalCenter} />
        <Route path="/enterprise" component={EnterpriseDashboard} />
        <Route path="/dashboard/corporate" component={CorporateDashboard} />
        <Route path="/dashboard/agency" component={AgencyDashboard} />
        <Route path="/demo" component={Demo} />
        <Route path="/demo/dashboard/corporate" component={CorporateDashboard} />
        <Route path="/demo/dashboard/agency" component={AgencyDashboard} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/help" component={HelpCenter} />
        <Route path="/calendar" component={CalendarSettings} />
        <Route path="/white-label" component={WhiteLabelSettings} />
        <Route path="/admin" component={AdminDashboard} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WhiteLabelProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </WhiteLabelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
