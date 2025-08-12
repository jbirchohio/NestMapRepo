import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin, RefreshCw, Search, Globe, Calendar, Image,
  AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Destination {
  id: number;
  slug: string;
  name: string;
  country: string;
  status: string;
  viewCount: number;
  activityCount: number;
  templateCount: number;
  coverImage?: string;
  updatedAt?: string;
  lastRegenerated?: string;
  aiGenerated?: boolean;
}

export default function DestinationManagement() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadDestinations();
  }, []);

  const loadDestinations = async () => {
    try {
      const response = await fetch('/api/admin/destinations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load destinations');
      const data = await response.json();
      setDestinations(data.destinations || []);
    } catch (error) {
      toast.error('Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedDestination || regenerating) return;

    const destination = destinations.find(d => d.slug === selectedDestination);
    if (!destination) return;

    const confirmRegen = window.confirm(
      `Are you sure you want to regenerate content for ${destination.name}? This will:\n\n` +
      `• Generate new AI content\n` +
      `• Find new images from Unsplash\n` +
      `• Update all text and FAQs\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmRegen) return;

    setRegenerating(true);

    try {
      const response = await fetch(`/api/destinations/${destination.slug}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to regenerate destination');

      const result = await response.json();
      toast.success(result.message || `Successfully regenerated ${destination.name}`);

      // Reload destinations to show updated data
      await loadDestinations();
      setSelectedDestination('');
    } catch (error) {
      toast.error(`Failed to regenerate ${destination.name}`);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Destination Regeneration
        </CardTitle>
        <CardDescription>
          Select a destination and regenerate its AI-generated content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Select Destination</label>
            <Select value={selectedDestination} onValueChange={setSelectedDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a destination to regenerate" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((destination) => (
                  <SelectItem key={destination.slug} value={destination.slug}>
                    {destination.name} ({destination.country})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleRegenerate}
            disabled={!selectedDestination || regenerating}
            className="min-w-[150px]"
          >
            {regenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>

        {selectedDestination && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">This will regenerate:</p>
                <ul className="mt-1 text-sm text-yellow-800 list-disc list-inside">
                  <li>All text content (overview, tips, FAQs)</li>
                  <li>Images from Unsplash API</li>
                  <li>Weather and activity information</li>
                  <li>Country and location data</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}