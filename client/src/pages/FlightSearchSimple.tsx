import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Plane, 
  MapPin,
  Calendar,
  Users,
  Search,
  AlertCircle,
  ArrowRight,
  ArrowLeftRight
} from "lucide-react";

export default function FlightSearchSimple() {
  const { toast } = useToast();
  const [isSearching, setIsSearching] = useState(false);
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('roundtrip');
  
  const [searchData, setSearchData] = useState({
    from: '',
    to: '',
    departDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    returnDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    passengers: 1
  });

  const handleSwapLocations = () => {
    setSearchData(prev => ({
      ...prev,
      from: prev.to,
      to: prev.from
    }));
  };

  const handleSearch = async () => {
    if (!searchData.from || !searchData.to || !searchData.departDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    // Simulate search
    setTimeout(() => {
      setIsSearching(false);
      toast({
        title: "Flight search coming soon!",
        description: "We're working on integrating flight search. For now, use our AI trip planner to add flights to your itinerary.",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Search Flights
            </h1>
            <p className="text-gray-600">
              Find the perfect flight for your next adventure
            </p>
          </div>

          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900">Flight booking integration in progress</AlertTitle>
            <AlertDescription className="text-blue-700">
              We're working on direct flight booking. For now, use our AI trip planner to add flights to your itinerary, 
              and we'll help you find the best options on partner sites.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5 text-purple-600" />
                Search Flights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trip Type */}
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tripType === 'roundtrip'}
                    onChange={() => setTripType('roundtrip')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span>Round Trip</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={tripType === 'oneway'}
                    onChange={() => setTripType('oneway')}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span>One Way</span>
                </label>
              </div>

              {/* From/To with Swap */}
              <div className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from">From</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="from"
                        placeholder="City or airport"
                        value={searchData.from}
                        onChange={(e) => setSearchData(prev => ({ ...prev, from: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="to">To</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="to"
                        placeholder="City or airport"
                        value={searchData.to}
                        onChange={(e) => setSearchData(prev => ({ ...prev, to: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Swap button */}
                <button
                  onClick={handleSwapLocations}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4 bg-white border rounded-full p-2 hover:bg-gray-50 transition-colors"
                  type="button"
                >
                  <ArrowLeftRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="depart">Departure</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="depart"
                      type="date"
                      value={searchData.departDate}
                      onChange={(e) => setSearchData(prev => ({ ...prev, departDate: e.target.value }))}
                      className="pl-9"
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>
                {tripType === 'roundtrip' && (
                  <div>
                    <Label htmlFor="return">Return</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="return"
                        type="date"
                        value={searchData.returnDate}
                        onChange={(e) => setSearchData(prev => ({ ...prev, returnDate: e.target.value }))}
                        className="pl-9"
                        min={searchData.departDate}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Passengers */}
              <div className="max-w-xs">
                <Label htmlFor="passengers">Passengers</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="passengers"
                    type="number"
                    min="1"
                    max="9"
                    value={searchData.passengers}
                    onChange={(e) => setSearchData(prev => ({ ...prev, passengers: parseInt(e.target.value) || 1 }))}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white"
              >
                {isSearching ? (
                  <>
                    <Plane className="mr-2 h-4 w-4 animate-pulse" />
                    Searching flights...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Flights
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Popular Routes */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Popular Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { from: 'New York', to: 'London', price: 'from $450' },
                  { from: 'Los Angeles', to: 'Tokyo', price: 'from $750' },
                  { from: 'Chicago', to: 'Paris', price: 'from $550' },
                  { from: 'Miami', to: 'Cancun', price: 'from $250' }
                ].map((route, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => {
                      setSearchData(prev => ({
                        ...prev,
                        from: route.from,
                        to: route.to
                      }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{route.from}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{route.to}</span>
                    </div>
                    <Badge variant="secondary">{route.price}</Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}