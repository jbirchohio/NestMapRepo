import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Briefcase,
  Clock,
  Utensils,
  Bed,
  Plane,
  Car,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  Share,
  Send,
  ArrowLeft
} from 'lucide-react';

export default function AITripGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedTrip, setGeneratedTrip] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  // Generate trip mutation
  const generateTripMutation = useMutation({
    mutationFn: (request: any) => apiRequest('POST', '/api/generate-business-trip', request),
    onSuccess: (data) => {
      setGeneratedTrip(data);
      setShowResults(true);
    }
  });

  const handleInputChange = (field: string, value: any) => {
    setTripRequest(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: string, value: string) => {
    setTripRequest(prev => ({
      ...prev,
      [field]: (prev[field as keyof typeof prev] as string[]).includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }));
  };

  const handleGenerate = () => {
    const formattedRequest = {
      clientName: tripRequest.clientName,
      destination: tripRequest.destination,
      startDate: tripRequest.startDate,
      endDate: tripRequest.endDate,
      budget: parseFloat(tripRequest.budget),
      currency: 'USD',
      workSchedule: {
        workDays: tripRequest.workDays,
        workHours: tripRequest.workHours,
        meetingBlocks: tripRequest.meetingBlocks ? [tripRequest.meetingBlocks] : []
      },
      preferences: {
        foodTypes: tripRequest.foodTypes,
        accommodationType: tripRequest.accommodationType,
        activityTypes: tripRequest.activityTypes,
        dietaryRestrictions: tripRequest.dietaryRestrictions ? [tripRequest.dietaryRestrictions] : []
      },
      companyInfo: {
        name: tripRequest.companyName,
        industry: tripRequest.industry
      },
      tripPurpose: tripRequest.tripPurpose,
      groupSize: tripRequest.groupSize
    };

    generateTripMutation.mutate(formattedRequest);
  };

  const isFormValid = tripRequest.clientName && tripRequest.destination && 
                     tripRequest.startDate && tripRequest.endDate && 
                     tripRequest.budget && tripRequest.tripPurpose;

  if (showResults && generatedTrip) {
    return <TripResultsView trip={generatedTrip} onBack={() => setShowResults(false)} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-yellow-600" />
            AI Business Trip Generator
          </CardTitle>
          <CardDescription>
            Simply describe your business trip needs and let our AI create a complete itinerary with flights, hotels, activities, and schedules
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Example */}
      <Alert>
        <Sparkles className="w-4 h-4" />
        <AlertDescription>
          <strong>Example:</strong> "I need a 3-day trip to London for client meetings with Acme Corp. Budget is $3,500. 
          Client likes fine dining and cultural activities. I need to work Monday-Wednesday 9-5 with a key presentation Tuesday at 2 PM."
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Basics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client/Traveler Name</Label>
              <Input
                id="clientName"
                placeholder="John Smith"
                value={tripRequest.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="London, UK"
                value={tripRequest.destination}
                onChange={(e) => handleInputChange('destination', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={tripRequest.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={tripRequest.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Budget (USD)</Label>
                <Input
                  id="budget"
                  type="number"
                  placeholder="3500"
                  value={tripRequest.budget}
                  onChange={(e) => handleInputChange('budget', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="groupSize">Group Size</Label>
                <Input
                  id="groupSize"
                  type="number"
                  min="1"
                  max="10"
                  value={tripRequest.groupSize}
                  onChange={(e) => handleInputChange('groupSize', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tripPurpose">Trip Purpose</Label>
              <Textarea
                id="tripPurpose"
                placeholder="Client meetings, product demo, contract negotiation..."
                value={tripRequest.tripPurpose}
                onChange={(e) => handleInputChange('tripPurpose', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Work Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Work Days</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
                  <Badge
                    key={day}
                    variant={tripRequest.workDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayToggle('workDays', day)}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="workHours">Work Hours</Label>
              <Input
                id="workHours"
                placeholder="9:00-17:00"
                value={tripRequest.workHours}
                onChange={(e) => handleInputChange('workHours', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="meetingBlocks">Specific Meeting Times</Label>
              <Input
                id="meetingBlocks"
                placeholder="Tuesday 14:00-16:00 - Key Presentation"
                value={tripRequest.meetingBlocks}
                onChange={(e) => handleInputChange('meetingBlocks', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Acme Corporation"
                value={tripRequest.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="Technology, Finance, Healthcare..."
                value={tripRequest.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="w-5 h-5" />
              Client Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Food Preferences</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Fine Dining', 'Local Cuisine', 'Business Lunch', 'Casual Dining', 'Vegetarian', 'Asian', 'European'].map(food => (
                  <Badge
                    key={food}
                    variant={tripRequest.foodTypes.includes(food) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayToggle('foodTypes', food)}
                  >
                    {food}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Activity Types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Networking', 'Cultural Sites', 'Museums', 'Entertainment', 'Shopping', 'Outdoor Activities', 'Nightlife'].map(activity => (
                  <Badge
                    key={activity}
                    variant={tripRequest.activityTypes.includes(activity) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleArrayToggle('activityTypes', activity)}
                  >
                    {activity}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Accommodation Level</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'luxury', label: 'Luxury (5★)' },
                  { value: 'business', label: 'Business (4★)' },
                  { value: 'budget', label: 'Budget (3★)' }
                ].map(option => (
                  <Badge
                    key={option.value}
                    variant={tripRequest.accommodationType === option.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleInputChange('accommodationType', option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="dietaryRestrictions">Dietary Restrictions</Label>
              <Input
                id="dietaryRestrictions"
                placeholder="Vegetarian, No shellfish, Kosher..."
                value={tripRequest.dietaryRestrictions}
                onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid || generateTripMutation.isPending}
              className="w-full h-16 text-lg"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {generateTripMutation.isPending ? 'Generating Your Perfect Trip...' : 'Generate AI Business Trip'}
            </Button>

            {generateTripMutation.isPending && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  🧠 Analyzing your requirements...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  ✈️ Finding optimal flights and hotels...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  🎯 Creating schedule with conflict detection...
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  🌍 Adding weather and crowd intelligence...
                </div>
              </div>
            )}

            {generateTripMutation.error && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Failed to generate trip. Please check your requirements and try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TripResultsView({ trip, onBack }: { trip: any; onBack: () => void }) {
  const [selectedTab, setSelectedTab] = useState('overview');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
                {trip.tripSummary?.title || 'Business Trip Generated'}
              </CardTitle>
              <CardDescription className="mt-2">
                {trip.tripSummary?.description || 'Your AI-generated business trip is ready for review'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack}>
                ← Back to Generator
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export Trip
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Cost</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${trip.budgetBreakdown?.total || trip.tripSummary?.totalCost || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Duration</p>
                <p className="text-2xl font-bold text-green-600">
                  {trip.tripSummary?.duration || 3} days
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Carbon Impact</p>
                <p className="text-2xl font-bold text-purple-600">
                  {trip.tripSummary?.carbonFootprint || 0} kg
                </p>
                <p className="text-xs text-gray-500">CO₂</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Conflicts</p>
                <p className="text-2xl font-bold text-red-600">
                  {trip.conflicts?.length || 0}
                </p>
                <p className="text-xs text-gray-500">Issues detected</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts Alert */}
      {trip.conflicts && trip.conflicts.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            <strong>{trip.conflicts.length} scheduling conflicts detected.</strong> Review the schedule tab to resolve timing issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Results */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="flights">Flights</TabsTrigger>
              <TabsTrigger value="hotels">Hotels</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Trip Highlights</h3>
                  <div className="space-y-2">
                    {trip.recommendations?.slice(0, 5).map((rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Compliance Notes</h3>
                  <div className="space-y-2">
                    {trip.complianceNotes?.slice(0, 5).map((note: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="flights" className="space-y-4">
              <h3 className="text-lg font-semibold">Flight Options</h3>
              <div className="space-y-3">
                {trip.flights?.slice(0, 3).map((flight: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{flight.airline} {flight.flightNumber}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {flight.origin} → {flight.destination}
                          </div>
                          <div className="text-sm text-gray-500">
                            Depart: {flight.departureTime} | Arrive: {flight.arrivalTime}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">${flight.price?.amount || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{flight.cabin}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="hotels" className="space-y-4">
              <h3 className="text-lg font-semibold">Accommodation Options</h3>
              <div className="space-y-3">
                {trip.accommodation?.slice(0, 3).map((hotel: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{hotel.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {hotel.address}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex">
                              {Array.from({ length: hotel.starRating || 4 }).map((_, i) => (
                                <span key={i} className="text-yellow-400">★</span>
                              ))}
                            </div>
                            {hotel.rating && (
                              <span className="text-sm text-gray-500">
                                {hotel.rating.score}/10 ({hotel.rating.reviews} reviews)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">${hotel.price?.amount || 'N/A'}</div>
                          <div className="text-sm text-gray-500">per {hotel.price?.per || 'night'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <h3 className="text-lg font-semibold">Daily Schedule</h3>
              <div className="space-y-4">
                {trip.activities?.slice(0, 10).map((activity: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{activity.title}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            {activity.locationName || activity.location}
                          </div>
                          {activity.notes && (
                            <div className="text-sm text-gray-500 mt-1">{activity.notes}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{activity.time}</div>
                          <Badge variant="outline" className="text-xs">
                            Day {activity.day}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="budget" className="space-y-4">
              <h3 className="text-lg font-semibold">Budget Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {trip.budgetBreakdown && Object.entries(trip.budgetBreakdown).map(([category, amount]) => (
                  <Card key={category}>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">${amount as number}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {trip.recommendations?.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weather Considerations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trip.weatherConsiderations ? (
                      <div className="space-y-2">
                        <p className="text-sm">Weather-optimized scheduling applied to your itinerary.</p>
                        {trip.weatherConsiderations.indoorAlternatives?.length > 0 && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            {trip.weatherConsiderations.indoorAlternatives.length} backup indoor activities included.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Weather data will be updated closer to your travel date.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}