import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/JWTAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import useMapbox from "@/hooks/useMapbox";
import { Calendar, MapPin, Hotel, X, ChevronRight, Search, Star, DollarSign } from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: any) => void;
}

interface HotelOption {
  id: string;
  name: string;
  rating: number;
  price: number;
  image: string;
  amenities: string[];
}

const tripSchema = z.object({
  title: z.string().min(1, "Give your trip a name!"),
  city: z.string().min(1, "Where are you going?"),
  startDate: z.date(),
  endDate: z.date(),
  cityLatitude: z.string().optional(),
  cityLongitude: z.string().optional(),
  hotelName: z.string().optional(),
  hotelAddress: z.string().optional(),
});

type TripFormValues = z.infer<typeof tripSchema>;

export default function NewTripModalWithHotel({
  isOpen,
  onClose,
  onTripCreated,
}: NewTripModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { geocodeLocation } = useMapbox();
  
  const [step, setStep] = useState<"destination" | "dates" | "hotel">("destination");
  const [isLoading, setIsLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);
  const [hotelOptions, setHotelOptions] = useState<HotelOption[]>([]);
  const [searchingHotels, setSearchingHotels] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      title: "",
      city: "",
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 10),
    },
  });

  const watchedCity = watch("city");
  const watchedStartDate = watch("startDate");
  const watchedEndDate = watch("endDate");
  const tripDuration = differenceInDays(watchedEndDate, watchedStartDate) + 1;

  // Search for locations
  useEffect(() => {
    if (searchQuery.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=5`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setLocationSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  // Search for hotels when reaching hotel step
  useEffect(() => {
    if (step === "hotel" && watchedCity && !hotelOptions.length) {
      searchHotels();
    }
  }, [step]);

  const searchHotels = async () => {
    setSearchingHotels(true);
    
    // Simulate hotel search - in production, this would call a real hotel API
    setTimeout(() => {
      setHotelOptions([
        {
          id: "1",
          name: "Hilton Garden Inn",
          rating: 4.3,
          price: 129,
          image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
          amenities: ["Free WiFi", "Pool", "Gym", "Breakfast"]
        },
        {
          id: "2",
          name: "Holiday Inn Express",
          rating: 4.1,
          price: 99,
          image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
          amenities: ["Free WiFi", "Breakfast", "Parking"]
        },
        {
          id: "3",
          name: "Boutique Hotel Downtown",
          rating: 4.6,
          price: 189,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
          amenities: ["Free WiFi", "Restaurant", "Bar", "Room Service"]
        },
        {
          id: "4",
          name: "Budget Inn & Suites",
          rating: 3.9,
          price: 79,
          image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400",
          amenities: ["Free WiFi", "Parking"]
        }
      ]);
      setSearchingHotels(false);
    }, 1500);
  };

  const selectLocation = async (suggestion: any) => {
    setValue("city", suggestion.place_name);
    if (suggestion.center) {
      setValue("cityLongitude", suggestion.center[0].toString());
      setValue("cityLatitude", suggestion.center[1].toString());
    }
    
    const locationName = suggestion.text || suggestion.place_name.split(",")[0];
    setValue("title", `${locationName} Trip`);
    
    setShowSuggestions(false);
    setSearchQuery("");
    setStep("dates");
  };

  const onSubmit = async (data: TripFormValues) => {
    setIsLoading(true);
    
    try {
      const tripData = {
        ...data,
        userId: user?.id,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        hotelName: selectedHotel?.name,
        hotelAddress: `${watchedCity} Hotel District`, // Simplified for demo
      };

      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(tripData),
      });

      if (!response.ok) {
        throw new Error("Failed to create trip");
      }

      const newTrip = await response.json();
      
      toast({
        title: "Trip booked! ✈️",
        description: selectedHotel ? "Hotel reserved too!" : "Ready for your adventure!",
      });

      onTripCreated(newTrip);
      reset();
      onClose();
    } catch (error) {
      console.error("Error creating trip:", error);
      toast({
        title: "Error",
        description: "Could not create trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-6 pb-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-3xl font-bold text-white mb-2">
                {step === "destination" && "Where to?"}
                {step === "dates" && "When?"}
                {step === "hotel" && "Where to stay?"}
              </h2>
              <p className="text-white/90 text-lg">
                {step === "destination" && "Pick your dream destination"}
                {step === "dates" && "Choose your travel dates"}
                {step === "hotel" && "Find the perfect place"}
              </p>
            </motion.div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 -mt-4 space-y-5">
            {/* Step 1: Destination */}
            {step === "destination" && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    {...register("city")}
                    placeholder="City or destination..."
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setValue("city", e.target.value);
                    }}
                    className="w-full bg-transparent pl-12 pr-4 py-4 text-lg outline-none"
                    autoFocus
                  />
                </div>
                
                {/* Location suggestions */}
                <AnimatePresence>
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden"
                    >
                      {locationSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => selectLocation(suggestion)}
                        >
                          <div className="font-medium">{suggestion.text}</div>
                          <div className="text-sm text-slate-500">{suggestion.place_name}</div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Step 2: Dates */}
            {step === "dates" && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep("destination")}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  ← Change destination
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">
                      Check in
                    </label>
                    <input
                      type="date"
                      {...register("startDate", { valueAsDate: true })}
                      min={format(new Date(), "yyyy-MM-dd")}
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <label className="text-sm text-slate-600 dark:text-slate-400 mb-1 block">
                      Check out
                    </label>
                    <input
                      type="date"
                      {...register("endDate", { valueAsDate: true })}
                      min={format(watchedStartDate, "yyyy-MM-dd")}
                      className="w-full bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-4 py-3 rounded-xl text-center">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  {tripDuration} nights in {watchedCity.split(',')[0]}
                </div>

                <Button
                  type="button"
                  onClick={() => setStep("hotel")}
                  className="w-full"
                  size="lg"
                >
                  Find hotels
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Step 3: Hotels */}
            {step === "hotel" && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-4"
              >
                <button
                  type="button"
                  onClick={() => setStep("dates")}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  ← Change dates
                </button>

                {searchingHotels ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Finding great hotels...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {hotelOptions.map((hotel) => (
                        <button
                          key={hotel.id}
                          type="button"
                          onClick={() => setSelectedHotel(hotel)}
                          className={`w-full p-3 rounded-xl border-2 transition-all ${
                            selectedHotel?.id === hotel.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex gap-3">
                            <img 
                              src={hotel.image} 
                              alt={hotel.name}
                              className="w-20 h-20 rounded-lg object-cover"
                            />
                            <div className="flex-1 text-left">
                              <h4 className="font-semibold">{hotel.name}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{hotel.rating}</span>
                                <span>•</span>
                                <span className="font-bold">${hotel.price}/night</span>
                              </div>
                              <div className="flex gap-2 mt-1">
                                {hotel.amenities.slice(0, 2).map((amenity) => (
                                  <span key={amenity} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {amenity}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onSubmit(watch())}
                      className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-2"
                    >
                      Skip hotel for now →
                    </button>
                  </>
                )}

                {selectedHotel && (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Hotel className="w-4 h-4" />
                        </motion.div>
                        Booking...
                      </span>
                    ) : (
                      <>
                        Book trip & hotel
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}