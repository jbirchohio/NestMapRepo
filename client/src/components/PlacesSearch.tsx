import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

export default function PlacesSearch({
  onPlaceSelected,
  initialValue = "",
  placeholder = "Search for a place",
  className = ""
}: PlacesSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to handle direct address search
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      // For demo purposes, create a hardcoded dataset of NYC landmarks
      const nycLandmarks = [
        {
          name: "Empire State Building",
          formattedAddress: "350 Fifth Avenue, New York, NY 10118",
          location: { lat: 40.7484, lng: -73.9857 }
        },
        {
          name: "Statue of Liberty",
          formattedAddress: "Liberty Island, New York, NY 10004",
          location: { lat: 40.6892, lng: -74.0445 }
        },
        {
          name: "Central Park",
          formattedAddress: "Central Park, New York, NY",
          location: { lat: 40.7812, lng: -73.9665 }
        },
        {
          name: "Times Square",
          formattedAddress: "Times Square, New York, NY 10036",
          location: { lat: 40.7580, lng: -73.9855 }
        },
        {
          name: "Brooklyn Bridge",
          formattedAddress: "Brooklyn Bridge, New York, NY 10038",
          location: { lat: 40.7061, lng: -73.9969 }
        },
        {
          name: "Leo House",
          formattedAddress: "332 W 23rd St, New York, NY 10011",
          location: { lat: 40.7453, lng: -73.9977 }
        },
        {
          name: "One World Trade Center",
          formattedAddress: "285 Fulton St, New York, NY 10007",
          location: { lat: 40.7127, lng: -74.0134 }
        },
        {
          name: "Metropolitan Museum of Art",
          formattedAddress: "1000 5th Ave, New York, NY 10028",
          location: { lat: 40.7794, lng: -73.9632 }
        },
        {
          name: "The High Line",
          formattedAddress: "The High Line, New York, NY 10011",
          location: { lat: 40.7480, lng: -74.0048 }
        }
      ];
      
      // Filter based on search term
      const searchTermLower = searchTerm.toLowerCase();
      const results = nycLandmarks.filter(landmark => 
        landmark.name.toLowerCase().includes(searchTermLower) ||
        landmark.formattedAddress.toLowerCase().includes(searchTermLower)
      );
      
      setSearchResults(results);
      
      // If we found an exact match, select it automatically
      const exactMatch = results.find(r => 
        r.name.toLowerCase() === searchTermLower
      );
      
      if (exactMatch) {
        handleSelectPlace(exactMatch);
      }
    } catch (error) {
      console.error("Error searching for places:", error);
      toast({
        title: "Error",
        description: "Failed to search for places. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Select a place from results
  const handleSelectPlace = (place: Place) => {
    setSearchTerm(place.name);
    setSearchResults([]);
    onPlaceSelected(place);
    
    // Show confirmation toast
    toast({
      title: "Location selected",
      description: place.formattedAddress,
      duration: 3000,
    });
  };

  // Auto-search on term change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length > 2) {
        handleSearch();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
        <Button 
          type="button"
          variant="outline" 
          className="ml-2"
          onClick={handleSearch}
          disabled={isSearching || !searchTerm.trim()}
        >
          {isSearching ? "..." : "Search"}
        </Button>
      </div>
      
      {searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[hsl(var(--card))] rounded-md shadow-lg max-h-60 overflow-auto">
          <ul className="py-1">
            {searchResults.map((place, index) => (
              <li 
                key={index}
                className="px-4 py-2 hover:bg-[hsl(var(--muted))] cursor-pointer"
                onClick={() => handleSelectPlace(place)}
              >
                <div className="font-medium">{place.name}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">{place.formattedAddress}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}