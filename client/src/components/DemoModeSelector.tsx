import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, ArrowRight } from "lucide-react";

export default function DemoModeSelector() {
  const [, setLocation] = useLocation();

  const handleCorporateDemo = () => {
    setLocation('/dashboard/corporate');
  };

  const handleAgencyDemo = () => {
    setLocation('/dashboard/agency');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Experience NestMap's Dual-Mode Interface
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Choose your business type to see how the interface adapts
          </p>
          <Badge variant="outline" className="bg-white">
            Demo Mode - Experience Both Interfaces
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Corporate Mode */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-blue-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Corporate Travel Management</CardTitle>
              <p className="text-gray-600 text-sm">
                For internal company travel coordination
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Features Include:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Company Travel Management Console</li>
                  <li>• Team trip planning and coordination</li>
                  <li>• Budget tracking and expense management</li>
                  <li>• Employee travel analytics</li>
                  <li>• Internal approval workflows</li>
                </ul>
              </div>
              <Button 
                onClick={handleCorporateDemo} 
                className="w-full"
                size="lg"
              >
                View Corporate Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Agency Mode */}
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-green-200">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Travel Agency & Client Services</CardTitle>
              <p className="text-gray-600 text-sm">
                For travel agencies serving clients
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Features Include:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Client Travel Proposal Workspace</li>
                  <li>• Branded proposal generation</li>
                  <li>• Commission and markup tracking</li>
                  <li>• Client relationship management</li>
                  <li>• Win rate analytics</li>
                </ul>
              </div>
              <Button 
                onClick={handleAgencyDemo} 
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                View Agency Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            This demo shows how NestMap adapts its interface based on your business type.
            <br />
            Navigation, branding, and features change automatically.
          </p>
        </div>
      </div>
    </div>
  );
}