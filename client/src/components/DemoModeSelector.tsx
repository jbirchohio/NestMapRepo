import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, ArrowRight } from "lucide-react";

export default function DemoModeSelector() {
  const [, setLocation] = useLocation();

  const handleCorporateDemo = () => {
    // Store demo mode in localStorage for persistence
    localStorage.setItem('demo-mode', 'corporate');
    localStorage.setItem('demo-user', JSON.stringify({
      id: 'demo-corp-1',
      username: 'demo-corporate',
      email: 'demo@corporate.com',
      display_name: 'Corporate Demo User',
      roleType: 'corporate',
      company: 'Demo Corporation',
      jobTitle: 'Travel Manager',
      teamSize: '50-200',
      primaryUseCase: 'Corporate Travel Management'
    }));
    setLocation('/dashboard/corporate');
  };

  const handleAgencyDemo = () => {
    // Store demo mode in localStorage for persistence
    localStorage.setItem('demo-mode', 'agency');
    localStorage.setItem('demo-user', JSON.stringify({
      id: 'demo-agency-1',
      username: 'demo-agency',
      email: 'demo@travelagency.com',
      display_name: 'Agency Demo User',
      roleType: 'agency',
      company: 'Demo Travel Agency',
      jobTitle: 'Travel Consultant',
      teamSize: '10-50',
      primaryUseCase: 'Travel Agency & Client Services'
    }));
    setLocation('/dashboard/agency');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-electric-50 to-electric-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-navy-900 dark:text-white mb-4">
            Experience Remvana's Dual-Mode Interface
          </h1>
          <p className="text-lg text-navy-600 dark:text-navy-300 mb-2">
            Choose your business type to see how the interface adapts
          </p>
          <Badge variant="outline" className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border-electric-300/30">
            Demo Mode - Experience Both Interfaces
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Corporate Mode */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-electric-300 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-electric-100 dark:bg-electric-900/20 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-electric-600" />
              </div>
              <CardTitle className="text-xl text-navy-900 dark:text-white">Corporate Travel Management</CardTitle>
              <p className="text-navy-600 dark:text-navy-300 text-sm">
                For internal company travel coordination
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-navy-900 dark:text-white">Features Include:</h4>
                <ul className="text-sm text-navy-600 dark:text-navy-300 space-y-1">
                  <li>• Company Travel Management Console</li>
                  <li>• Team trip planning and coordination</li>
                  <li>• Budget tracking and expense management</li>
                  <li>• Employee travel analytics</li>
                  <li>• Internal approval workflows</li>
                </ul>
              </div>
              <Button 
                onClick={handleCorporateDemo} 
                className="w-full bg-electric-500 hover:bg-electric-600 text-white"
                size="lg"
              >
                View Corporate Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Agency Mode */}
          <Card className="hover:shadow-xl transition-all duration-300 border-2 hover:border-electric-300 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-electric-100 dark:bg-electric-900/20 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-electric-600" />
              </div>
              <CardTitle className="text-xl text-navy-900 dark:text-white">Travel Agency & Client Services</CardTitle>
              <p className="text-navy-600 dark:text-navy-300 text-sm">
                For travel agencies serving clients
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-navy-900 dark:text-white">Features Include:</h4>
                <ul className="text-sm text-navy-600 dark:text-navy-300 space-y-1">
                  <li>• Client Travel Proposal Workspace</li>
                  <li>• Branded proposal generation</li>
                  <li>• Commission and markup tracking</li>
                  <li>• Client relationship management</li>
                  <li>• Win rate analytics</li>
                </ul>
              </div>
              <Button 
                onClick={handleAgencyDemo} 
                className="w-full bg-electric-500 hover:bg-electric-600 text-white"
                size="lg"
              >
                View Agency Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-navy-500 dark:text-navy-400">
            This demo shows how Remvana adapts its interface based on your business type.
            <br />
            Navigation, branding, and features change automatically.
          </p>
        </div>
      </div>
    </div>
  );
}