import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import TripPlanner from "@/pages/TripPlanner";
import SimpleShare from "@/pages/SimpleShare";
import Analytics from "@/pages/Analytics";
import TeamManagement from "@/components/TeamManagement";
import BillingDashboard from "@/components/BillingDashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/trip/:id" component={TripPlanner} />
      <Route path="/share/:shareCode" component={SimpleShare} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/team" component={TeamManagement} />
      <Route path="/billing" component={BillingDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
