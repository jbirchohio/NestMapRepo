import SharedTripType from '@/types/SharedTripType';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Search, Calendar, MapPin, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ProposalGenerator from "@/components/ProposalGenerator";
export default function ProposalCenter() {
    const [selectedTrip, setSelectedTrip] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    // Fetch real trips data from API
    const { data: trips, isLoading } = useQuery({
        queryKey: ['/api/trips'],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/trips");
            if (!response.ok) {
                throw new Error("Failed to fetch trips");
            }
            return response.json();
        }
    });
    const filteredTrips = trips?.filter((trip: SharedTripType) => trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.city?.toLowerCase().includes(searchTerm.toLowerCase())) || [];
    const selectedTripData = trips?.find((trip: SharedTripType) => trip.id === selectedTrip);
    return (<div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <FileText className="h-8 w-8 text-blue-600"/>
          <h1 className="text-3xl font-bold">AI Proposal Center</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Transform your trips into professional, branded proposals with AI-powered cost estimates. 
          Perfect for travel agents, B2B teams, and enterprise clients.
        </p>
        
        {/* Feature Highlights */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Badge variant="secondary" className="text-sm">
            <TrendingUp className="h-4 w-4 mr-1"/>
            AI Cost Analysis
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <FileText className="h-4 w-4 mr-1"/>
            Professional PDFs
          </Badge>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-4 w-4 mr-1"/>
            Custom Branding
          </Badge>
        </div>
      </div>

      {!selectedTrip ? (<>
          {/* Trip Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5"/>
                Select a Trip for Proposal
              </CardTitle>
              <CardDescription>
                Choose a trip to generate a professional travel proposal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"/>
                <Input placeholder="Search trips by title or destination..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
              </div>

              {/* Trip List */}
              {isLoading ? (<div className="space-y-3">
                  {[1, 2, 3].map((i) => (<div key={i} className="p-4 border rounded-lg">
                      <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>))}
                </div>) : filteredTrips.length > 0 ? (<div className="grid gap-3">
                  {filteredTrips.map((trip: SharedTripType) => (<Card key={trip.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500" onClick={() => setSelectedTrip(trip.id)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2 flex-1">
                            <h3 className="font-semibold text-lg">{trip.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              {trip.city && (<div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4"/>
                                  {trip.city}{trip.country && `, ${trip.country}`}
                                </div>)}
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4"/>
                                {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setSelectedTrip(trip.id)}>
                            Create Proposal
                          </Button>
                        </div>
                      </CardContent>
                    </Card>))}
                </div>) : (<div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50"/>
                  <p>No trips found matching your search.</p>
                  <p className="text-sm">Try adjusting your search terms or create a new trip.</p>
                </div>)}
            </CardContent>
          </Card>

          {/* Benefits Section */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600"/>
                  AI-Powered Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Intelligent cost estimation based on destination, trip duration, and activity types. 
                  Get competitive, accurate pricing that builds client trust.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600"/>
                  Professional Branding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Customizable proposals with your company logo, branding, and contact information. 
                  Create impressive documents that showcase your professionalism.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-electric-600"/>
                  Enterprise Ready
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Perfect for travel agents, B2B teams, and enterprise clients. 
                  Save hours of manual work while delivering exceptional client experiences.
                </p>
              </CardContent>
            </Card>
          </div>
        </>) : (<>
          {/* Back Button */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedTrip(null)}>
              ← Back to Trip Selection
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{selectedTripData?.title}</h2>
              <p className="text-gray-600">
                {selectedTripData?.city}{selectedTripData?.country && `, ${selectedTripData.country}`}
              </p>
            </div>
          </div>

          {/* Proposal Generator */}
          <ProposalGenerator tripId={selectedTrip} tripTitle={selectedTripData?.title || ""}/>
        </>)}
    </div>);
}
