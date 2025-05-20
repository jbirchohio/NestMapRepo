import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useDebounce } from "@/hooks/use-debounce";

interface Place {
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface PlacesSearchProps {
  onPlaceSelected: (place: Place) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
}

interface AILocationResponse {
  name: string;
  fullAddress: string;
  city: string;
  region?: string;
  country?: string;
  description?: string;
  error?: string;
}

export default function PlacesSearch({
  onPlaceSelected,
  initialValue = "",
  placeholder = "Search for a place",
  className = "",
}: PlacesSearchProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchTerm = useDebounce(inputValue, 500);

  // Get coordinates from Mapbox using the AI-provided address
  async function getCoordinates(address: string): Promise<[number, number] | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${import.meta.env.VITE_MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return [lat, lng]; // Return as [lat, lng] for consistency
      }
      return null;
    } catch (error) {
      console.error("Error getting coordinates:", error);
      return null;
    }
  }

  // Call our AI location search API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["locationSearch", debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 3) {
        return null;
      }
      
      const response = await fetch("/api/ai/find-location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ searchQuery: debouncedSearchTerm })
      });
      
      if (!response.ok) {
        throw new Error("Failed to find location");
      }
      
      return await response.json() as AILocationResponse;
    },
    enabled: debouncedSearchTerm.length >= 3,
  });

  // When AI location data is available, get coordinates from Mapbox
  useEffect(() => {
    const getLocationDetails = async () => {
      if (data && !data.error && !isLoading) {
        // Get coordinates for the resolved address
        const coords = await getCoordinates(data.fullAddress);
        
        if (coords) {
          const [lat, lng] = coords;
          // Create a Place object from the AI and Mapbox data
          const place: Place = {
            name: data.name,
            formattedAddress: data.fullAddress,
            location: {
              lat,
              lng
            }
          };
          
          onPlaceSelected(place);
          setShowResults(false);
        }
      }
    };
    
    if (showResults && data && !isLoading) {
      getLocationDetails();
    }
  }, [data, isLoading, showResults]);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        resultsRef.current && 
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle input changes
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    if (e.target.value.length >= 3) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }

  // Handle search submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inputValue.length >= 3) {
      refetch();
    }
  }

  return (
    <div className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pr-10"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </form>

      {/* Loading Indicator and Results */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute z-10 mt-1 w-full rounded-md border border-input bg-background shadow-md"
        >
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">
                Finding location...
              </span>
            </div>
          ) : data ? (
            data.error ? (
              <div className="p-3 text-sm text-muted-foreground">
                Couldn't find that location. Try adding more details.
              </div>
            ) : (
              <div 
                className="p-3 flex items-start cursor-pointer hover:bg-muted"
                onClick={() => refetch()}
              >
                <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-blue-500" />
                <div>
                  <div className="font-medium">{data.name}</div>
                  <div className="text-sm text-muted-foreground">{data.fullAddress}</div>
                </div>
              </div>
            )
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              Type at least 3 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
}