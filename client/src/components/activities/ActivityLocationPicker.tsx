import React, { useState } from "react";
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
    onLocationSelect: (location: { name: string; lat: number; lng: number }) => void;
    initialValue?: string;
}
export default function ActivityLocationPicker({ onLocationSelect, initialValue = "" }: ActivityLocationPickerProps) {
    const [searchQuery, setSearchQuery] = useState(initialValue);
    const handlePlaceSelect = (place: Place) => {
        onLocationSelect({
            name: place.name,
            lat: place.location.lat,
            lng: place.location.lng
        });
        setSearchQuery(place.name);
    };
    return (<div className="relative">
      <Input placeholder="Search for a location" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
      {searchQuery && (<PlacesSearch onPlaceSelected={handlePlaceSelect} initialValue={searchQuery} onClose={() => setSearchQuery("")}/>)}
    </div>);
}
