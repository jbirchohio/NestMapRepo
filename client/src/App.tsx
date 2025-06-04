import React from "react";
import { Switch, Route, useLocation } from "wouter";
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
import SequentialBookingFlights from "@/pages/SequentialBookingFlights";
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
import ProfileSettings from "@/pages/ProfileSettings";
import HelpCenter from "@/pages/HelpCenter";
import CalendarSettings from "@/pages/CalendarSettings";
import WhiteLabelSettings from "@/components/WhiteLabelSettings";
import AdminDashboard from "@/pages/AdminDashboard";
import CorporateCards from "@/pages/CorporateCards";
import OrganizationFunding from "@/pages/OrganizationFunding";
import Superadmin from "@/pages/SuperadminFixed";
import SuperadminOrganizationDetail from "@/pages/SuperadminOrganizationDetail";
import BillingDemo from "@/pages/BillingDemo";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();
  const isSupeadminView = location.startsWith('/superadmin');
  
  return (
    <>
      {!isSupeadminView && <MainNavigation />}
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/trip/:id" component={TripPlanner} />
        <Route path="/trip-planner/:id" component={TripPlanner} />
        <Route path="/share/:shareCode" component={SimpleShare} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/sequential-booking" component={SequentialBookingFlights} />
        <Route path="/ai-generator" component={AITripGeneratorPage} />
        <Route path="/optimizer" component={TripOptimizer} />
        <Route path="/settings" component={Settings} />
        <Route path="/team" component={TeamManagement} />
        <Route path="/billing" component={BillingDashboard} />
        <Route path="/proposals" component={ProposalCenter} />
        <Route path="/enterprise" component={EnterpriseDashboard} />
        <Route path="/dashboard/corporate" component={CorporateDashboard} />
        <Route path="/dashboard/agency" component={AgencyDashboard} />
        <Route path="/demo" component={DemoModeSelector} />
        <Route path="/profile" component={ProfileSettings} />
        <Route path="/help" component={HelpCenter} />
        <Route path="/calendar" component={CalendarSettings} />
        <Route path="/white-label" component={WhiteLabelSettings} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/superadmin" component={Superadmin} />
        <Route path="/superadmin/organizations/:id" component={SuperadminOrganizationDetail} />
        <Route path="/superadmin/:section" component={Superadmin} />
        <Route path="/billing-demo" component={BillingDemo} />
        <Route path="/corporate-cards" component={CorporateCards} />
        <Route path="/organization-funding" component={OrganizationFunding} />
        <Route path="/onboarding" component={Onboarding} />
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
