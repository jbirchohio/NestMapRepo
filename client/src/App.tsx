import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/JWTAuthContext";
import { WhiteLabelProvider, useWhiteLabel } from "@/contexts/WhiteLabelContext";
import MainNavigation from "@/components/MainNavigation";
import BrandedFooter from "@/components/BrandedFooter";
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
import Dashboard from "@/pages/Dashboard";
import CorporateDashboard from "@/pages/CorporateDashboard";
import AgencyDashboard from "@/pages/AgencyDashboard";
import DemoModeSelector from "@/components/DemoModeSelector";
import ProfileSettings from "@/pages/ProfileSettings";
import HelpCenter from "@/pages/HelpCenter";
import CalendarSettings from "@/pages/CalendarSettings";
import WhiteLabelSettings from "@/components/WhiteLabelSettings";
import BrandingSetup from "@/pages/BrandingSetup";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminRoles from "@/pages/AdminRoles";
import AdminSecurity from "@/pages/AdminSecurity";
import AdminSettings from "@/pages/AdminSettings";
import AdminLogs from "@/pages/AdminLogs";
import AdminSystemMetrics from "@/pages/AdminSystemMetrics";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import CorporateCards from "@/pages/CorporateCards";
import OrganizationFunding from "@/pages/OrganizationFunding";
import Superadmin from "@/pages/SuperadminClean";
import SuperadminOrganizationDetail from "@/pages/SuperadminOrganizationDetail";
import BillingDemo from "@/pages/BillingDemo";
import Onboarding from "@/pages/Onboarding";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/not-found";

function NavigationWrapper() {
  const { config } = useWhiteLabel();
  const { user } = useAuth();
  const [location] = useLocation();
  
  const isSuperadminView = location.startsWith('/superadmin');
  const isLoginPage = location === '/login';
  
  // Force re-render when branding colors change
  const brandingKey = `${config.primaryColor}-${config.secondaryColor}-${config.accentColor}`;
  
  if (!isSuperadminView && !isLoginPage && user) {
    return <MainNavigation key={brandingKey} />;
  }
  return null;
}

function Router() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isSuperadminView = location.startsWith('/superadmin');
  const isLoginPage = location === '/login';
  
  return (
    <div className="min-h-screen flex flex-col bg-soft-100 dark:bg-navy-900">
      <NavigationWrapper />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/trip/:id" component={TripPlanner} />
          <Route path="/trip-planner/:id" component={TripPlanner} />
          <Route path="/trip-planner" component={TripPlanner} />
          <Route path="/flights" component={Bookings} />
          <Route path="/share/:shareCode" component={SimpleShare} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/sequential-booking" component={SequentialBookingFlights} />
          <Route path="/ai-generator" component={AITripGeneratorPage} />
          <Route path="/optimizer" component={TripOptimizer} />
          <Route path="/settings" component={Settings} />
          <Route path="/team" component={TeamManagement} />
          <Route path="/teams" component={TeamManagement} />
          <Route path="/billing" component={BillingDashboard} />
          <Route path="/proposals" component={ProposalCenter} />
          <Route path="/enterprise" component={EnterpriseDashboard} />
          <Route path="/dashboard" component={Dashboard} />
          {/* Legacy routes for backward compatibility */}
          <Route path="/dashboard/corporate" component={Dashboard} />
          <Route path="/dashboard/agency" component={Dashboard} />
          <Route path="/demo" component={DemoModeSelector} />
          <Route path="/profile" component={ProfileSettings} />
          <Route path="/help" component={HelpCenter} />
          <Route path="/calendar" component={CalendarSettings} />
          <Route path="/white-label" component={Settings} />
          <Route path="/branding" component={Settings} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin-dashboard" component={AdminDashboard} />
          <Route path="/admin/settings" component={AdminSettings} />
          <Route path="/admin/roles" component={AdminRoles} />
          <Route path="/admin/security" component={AdminSecurity} />
          <Route path="/admin/logs" component={AdminLogs} />
          <Route path="/admin/system-metrics" component={AdminSystemMetrics} />
          <Route path="/admin/performance" component={PerformanceDashboard} />
          <Route path="/superadmin" component={Superadmin} />
          <Route path="/superadmin/organizations/:id" component={SuperadminOrganizationDetail} />
          <Route path="/superadmin/:section" component={Superadmin} />
          <Route path="/billing-demo" component={BillingDemo} />
          <Route path="/corporate-cards" component={CorporateCards} />
          <Route path="/organization-funding" component={OrganizationFunding} />
          <Route path="/onboarding" component={Onboarding} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {!isSuperadminView && <BrandedFooter />}
    </div>
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
