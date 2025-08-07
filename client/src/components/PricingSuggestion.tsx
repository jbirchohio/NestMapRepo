import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricingSuggestionProps {
  duration: number;
  activityCount: number;
  destinations: string[];
  tags: string[];
  hasFlights?: boolean;
  hasHotels?: boolean;
  hasMeals?: boolean;
  onPriceSelect: (price: number) => void;
  currentPrice?: number;
}

interface PriceSuggestion {
  suggested: number;
  minimum: number;
  maximum: number;
  reasoning: string[];
  priceRange: 'budget' | 'standard' | 'premium' | 'luxury';
}

export default function PricingSuggestion({
  duration,
  activityCount,
  destinations,
  tags,
  hasFlights,
  hasHotels,
  hasMeals,
  onPriceSelect,
  currentPrice
}: PricingSuggestionProps) {
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSuggestion();
  }, [duration, activityCount, destinations.length, tags.length]);

  const fetchSuggestion = async () => {
    if (!duration || duration === 0) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        duration: duration.toString(),
        activityCount: activityCount.toString(),
        destinations: destinations.join(','),
        tags: tags.join(','),
        hasFlights: String(hasFlights || false),
        hasHotels: String(hasHotels || false),
        hasMeals: String(hasMeals || false)
      });

      const response = await fetch(`/api/templates/suggest-price?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestion(data);
      }
    } catch (error) {
      console.error('Failed to fetch price suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!suggestion && !loading) return null;

  const getRangeColor = (range: string) => {
    switch (range) {
      case 'budget': return 'text-green-600';
      case 'standard': return 'text-blue-600';
      case 'premium': return 'text-purple-600';
      case 'luxury': return 'text-amber-600';
      default: return 'text-gray-600';
    }
  };

  const getRangeIcon = (range: string) => {
    switch (range) {
      case 'budget': return '💰';
      case 'standard': return '⭐';
      case 'premium': return '✨';
      case 'luxury': return '👑';
      default: return '📍';
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <h3 className="font-medium text-sm">AI Pricing Suggestion</h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowDetails(!showDetails)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>See pricing breakdown</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Calculating suggested price...</div>
      ) : suggestion && (
        <>
          <div className="space-y-3">
            {/* Suggested Price */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  ${suggestion.suggested.toFixed(2)}
                </div>
                <div className={`text-xs ${getRangeColor(suggestion.priceRange)} font-medium`}>
                  {getRangeIcon(suggestion.priceRange)} {suggestion.priceRange.charAt(0).toUpperCase() + suggestion.priceRange.slice(1)} Template
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onPriceSelect(suggestion.suggested)}
                variant={currentPrice === suggestion.suggested ? "default" : "outline"}
              >
                Use This Price
              </Button>
            </div>

            {/* Price Range */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Min: ${suggestion.minimum.toFixed(2)}</span>
                <span>Max: ${suggestion.maximum.toFixed(2)}</span>
              </div>
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                  style={{
                    left: `${((suggestion.minimum / suggestion.maximum) * 100)}%`,
                    right: `${(100 - ((suggestion.suggested / suggestion.maximum) * 100))}%`
                  }}
                />
                <div 
                  className="absolute h-full w-1 bg-purple-600"
                  style={{
                    left: `${((suggestion.suggested / suggestion.maximum) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Quick Price Options */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onPriceSelect(suggestion.minimum)}
              >
                Budget
                <br />
                ${suggestion.minimum.toFixed(2)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onPriceSelect(suggestion.suggested)}
              >
                Recommended
                <br />
                ${suggestion.suggested.toFixed(2)}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => onPriceSelect(suggestion.maximum)}
              >
                Premium
                <br />
                ${suggestion.maximum.toFixed(2)}
              </Button>
            </div>

            {/* Reasoning (collapsible) */}
            {showDetails && suggestion.reasoning.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-2">
                  How we calculated this:
                </div>
                <ul className="space-y-1">
                  {suggestion.reasoning.map((reason, i) => (
                    <li key={i} className="text-xs text-gray-500 flex items-start">
                      <TrendingUp className="h-3 w-3 mr-1 mt-0.5 text-purple-400" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  );
}