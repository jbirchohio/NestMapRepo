import { useState } from "react";
import { Input } from "@/components/ui/input";
import PlacesSearch from "@/components/PlacesSearch";

interface Place {
  name: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface ActivityLocationPickerProps {
  setValue: (field: string, value: string) => void;
}

export default function ActivityLocationPicker({ setValue }: ActivityLocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handlePlaceSelect = (place: Place) => {
    setValue("locationName", place.name);
    setValue("latitude", place.location.lat.toString());
    setValue("longitude", place.location.lng.toString());
  };

  return (
    <div className="relative">
      <Input
        placeholder="Search for a location"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <PlacesSearch
          onPlaceSelected={handlePlaceSelect}
          initialValue={searchQuery}
          onClose={() => setSearchQuery("")}
        />
      )}
    </div>
  );
}
