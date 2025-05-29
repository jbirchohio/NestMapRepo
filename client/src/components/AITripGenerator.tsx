import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  const [conversation, setConversation] = useState<any[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [showClientForm, setShowClientForm] = useState(false);
  const { toast } = useToast();

  const createItineraryMutation = useMutation({
    mutationFn: async (data: { tripData: any; clientEmail: string }) => {
      const response = await apiRequest('POST', '/api/create-client-itinerary', data);
      if (!response.ok) {
        throw new Error('Failed to create itinerary');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Itinerary Created",
        description: `Client tracking link sent to ${clientEmail}`,
      });
      setShowClientForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create client itinerary",
        variant: "destructive",
      });
    }
  });

  const generateProposalMutation = useMutation({
    mutationFn: async (data: { tripData: any; clientInfo: any }) => {
      const response = await apiRequest('POST', '/api/generate-proposal', data);
      if (!response.ok) {
        throw new Error('Failed to generate proposal');
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'travel-proposal.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Proposal Generated",
        description: "Professional PDF proposal downloaded",
      });
    }
  });

  const handleCreateItinerary = () => {
    setShowClientForm(true);
  };

  const handleSubmitClientForm = () => {
    if (!clientEmail) {
      toast({
        title: "Email Required",
        description: "Please enter client email address",
        variant: "destructive",
      });
      return;
    }
    
    createItineraryMutation.mutate({
      tripData: generatedTrip,
      clientEmail
    });
  };

  const handleGenerateProposal = () => {
    generateProposalMutation.mutate({
      tripData: generatedTrip,
      clientInfo: {
        email: clientEmail,
        name: "Client",
        company: "Company Name"
      }
    });
  };

  const generateTripMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      const response = await apiRequest('POST', '/api/generate-ai-trip', { 
        prompt: userPrompt,
        conversation 
      });
      if (!response.ok) {
        throw new Error('Failed to generate trip');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.type === 'questions') {
        // Assistant needs more information
        setShowQuestions(true);
        setAssistantMessage(data.message);
        setConversation(data.conversation);
        setIsGenerating(false);
      } else {
        // Complete trip generated
        setGeneratedTrip(data);
        setShowQuestions(false);
        setIsGenerating(false);
      }
    },
    onError: () => {
      setIsGenerating(false);
    }
  });

  const handleGenerateTrip = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    generateTripMutation.mutate(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateTrip();
    }
  };

  if (generatedTrip) {
    return <TripResultsView trip={generatedTrip} onBack={() => {
      setGeneratedTrip(null);
      setShowQuestions(false);
      setConversation([]);
      setPrompt('');
    }} />;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Sparkles className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">AI Trip Assistant</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {showQuestions ? 
            "Let me gather a few more details to find the best flights and hotels for your trip!" :
            "Describe your business trip and I'll help plan everything with real pricing and availability."
          }
        </p>
      </div>

      {/* Show conversation when assistant asks questions */}
      {showQuestions && conversation.length > 0 && (
        <Card className="w-full border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Travel Assistant</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 border">
              <p className="text-gray-800 mb-3">{assistantMessage}</p>
              {conversation.length > 0 && conversation[conversation.length - 1].content && (
                <div className="space-y-2">
                  {conversation[conversation.length - 1].content.split('\n').filter(line => line.includes('?')).map((question, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-blue-600 font-medium">{index + 1}.</span>
                      <span className="text-gray-700">{question.trim()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-blue-600 font-medium">
              Please provide these details below to continue:
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <span>Describe Your Business Trip</span>
          </CardTitle>
          <CardDescription>
            Tell us about your destination, dates, budget, business requirements, and preferences. Be as detailed as you'd like!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Example: I need a 3-day business trip to New York City from March 15-17, 2024. Budget around $2500. I have client meetings on March 16th from 2-4pm. I prefer business hotels near Manhattan, enjoy fine dining, and would like some cultural activities in the evenings. I have dietary restrictions for vegetarian food..."
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Press Shift + Enter for new line, Enter to generate
            </div>
            <Button
              onClick={handleGenerateTrip}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generate Trip</span>
                </>
              )}
            </Button>
          </div>

          {generateTripMutation.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to generate trip. Please try again or refine your request.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-medium">Smart Destinations</h3>
              <p className="text-sm text-gray-600">AI finds the best locations and venues</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-medium">Schedule Optimization</h3>
              <p className="text-sm text-gray-600">Conflicts avoided, time maximized</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-medium">Budget Planning</h3>
              <p className="text-sm text-gray-600">Detailed cost breakdown and optimization</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function TripResultsView({ trip, onBack }: { trip: any; onBack: () => void }) {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Generator</span>
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Share className="w-4 h-4" />
            <span>Share Trip</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span>{trip.tripSummary?.title || "Generated Business Trip"}</span>
          </CardTitle>
          <CardDescription>
            {trip.tripSummary?.description || "Your AI-generated business trip itinerary"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-sm font-medium">Duration</div>
              <div className="text-lg font-bold">{trip.tripSummary?.duration || 0} days</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-sm font-medium">Total Cost</div>
              <div className="text-lg font-bold">${trip.tripSummary?.totalCost || 0}</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div className="text-sm font-medium">Activities</div>
              <div className="text-lg font-bold">{trip.activities?.length || 0}</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Plane className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <div className="text-sm font-medium">Carbon</div>
              <div className="text-lg font-bold">{trip.tripSummary?.carbonFootprint || 0} kg</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Plane className="w-5 h-5 text-blue-600" />
                <span>Flights</span>
              </h3>
              {trip.flights?.map((flight: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{flight.airline} {flight.flightNumber}</div>
                      <div className="text-sm text-gray-600">{flight.route}</div>
                      <div className="text-sm text-gray-500">{flight.departure} - {flight.arrival}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${flight.price}</div>
                      <Badge variant="secondary">{flight.cabin}</Badge>
                    </div>
                  </div>
                </Card>
              ))}

              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Bed className="w-5 h-5 text-purple-600" />
                <span>Accommodation</span>
              </h3>
              {trip.accommodation?.map((hotel: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{hotel.name}</div>
                      <div className="text-sm text-gray-600">{hotel.address}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        {[...Array(hotel.stars)].map((_, i) => (
                          <span key={i} className="text-yellow-400">★</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${hotel.pricePerNight}/night</div>
                      <div className="text-sm text-gray-500">{hotel.checkIn} - {hotel.checkOut}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <span>Activities & Schedule</span>
              </h3>
              {trip.activities?.map((activity: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-gray-600">{activity.description}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {activity.startTime} - {activity.endTime}
                      </div>
                    </div>
                    <Badge variant="outline">{activity.category}</Badge>
                  </div>
                </Card>
              ))}

              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Utensils className="w-5 h-5 text-orange-600" />
                <span>Dining</span>
              </h3>
              {trip.meals?.map((meal: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{meal.restaurant}</div>
                      <div className="text-sm text-gray-600">{meal.cuisine} • {meal.location}</div>
                      <div className="text-sm text-gray-500">{meal.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${meal.estimatedCost}</div>
                      <Badge variant="secondary">{meal.type}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {trip.recommendations && trip.recommendations.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">AI Recommendations</h3>
              <ul className="space-y-1">
                {trip.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm text-blue-800">• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {trip.conflicts && trip.conflicts.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Potential Conflicts:</strong> {trip.conflicts.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* B2B Action Buttons */}
          <div className="mt-6 space-y-4 border-t pt-4">
            <h3 className="font-semibold text-gray-900">Client Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={handleCreateItinerary}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={createItineraryMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                {createItineraryMutation.isPending ? "Creating..." : "Create Client Itinerary"}
              </Button>
              
              <Button 
                onClick={handleGenerateProposal}
                variant="outline"
                disabled={generateProposalMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {generateProposalMutation.isPending ? "Generating..." : "Generate Proposal PDF"}
              </Button>
            </div>
          </div>

          {/* Client Form Modal */}
          {showClientForm && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Send Itinerary to Client</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="clientEmail">Client Email Address</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="client@company.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmitClientForm}
                    disabled={createItineraryMutation.isPending}
                    className="flex-1"
                  >
                    Send Tracking Link
                  </Button>
                  <Button 
                    onClick={() => setShowClientForm(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Client will receive a mobile-friendly tracking link and email notifications for any updates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}