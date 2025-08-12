import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles, AlertCircle, CheckCircle, Loader2, MapPin, DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface CityCheckResult {
  exists: boolean;
  templateCount?: number;
  message: string;
}

export default function TemplateGenerator() {
  const [city, setCity] = useState('');
  const [price, setPrice] = useState('');
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checkResult, setCheckResult] = useState<CityCheckResult | null>(null);
  
  // Budget generation fields
  const [includeBudget, setIncludeBudget] = useState(true);
  const [budgetLevel, setBudgetLevel] = useState<'budget' | 'mid' | 'luxury'>('mid');
  const [dailyBudget, setDailyBudget] = useState('');

  const handleCheckCity = async () => {
    if (!city.trim()) {
      toast.error('Please enter a city name');
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      const response = await fetch('/api/admin/templates/check-city', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ city: city.trim() })
      });

      if (!response.ok) throw new Error('Failed to check city');

      const result = await response.json();
      setCheckResult(result);

      if (result.exists && result.templateCount > 0) {
        toast.warning(`${city} already has ${result.templateCount} template(s)`);
      } else {
        toast.success(`${city} is available for template generation!`);
      }
    } catch (error) {
      toast.error('Failed to check city availability');
    } finally {
      setChecking(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!city.trim()) {
      toast.error('Please enter a city name');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (checkResult?.exists && checkResult?.templateCount && checkResult.templateCount > 0) {
      const confirmGenerate = window.confirm(
        `${city} already has ${checkResult.templateCount} template(s). Do you still want to generate a new one?`
      );
      if (!confirmGenerate) return;
    }

    setGenerating(true);

    try {
      const response = await fetch('/api/admin/templates/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city: city.trim(),
          price: parseFloat(price),
          includeBudget,
          budgetLevel,
          dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null
        })
      });

      if (!response.ok) throw new Error('Failed to generate template');

      const result = await response.json();
      toast.success(`Successfully generated template for ${city}!`);

      // Reset form
      setCity('');
      setPrice('');
      setCheckResult(null);

      // Redirect to template view
      if (result.templateId) {
        window.open(`/template/${result.templateId}`, '_blank');
      }
    } catch (error) {
      toast.error('Failed to generate template');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Template Generator
        </CardTitle>
        <CardDescription>
          Generate AI-powered templates for any city
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">
                <MapPin className="inline h-4 w-4 mr-1" />
                City Name
              </Label>
              <Input
                id="city"
                placeholder="e.g., Barcelona, Tokyo, New York"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={handleCheckCity}
              />
            </div>
            <div>
              <Label htmlFor="price">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Template Price (USD)
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g., 49.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Duration will be based on price (higher price = longer trip)
              </p>
            </div>
          </div>

          {/* Budget Generation Section */}
          <div className="border rounded-lg p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="includeBudget"
                checked={includeBudget}
                onChange={(e) => setIncludeBudget(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="includeBudget" className="font-semibold cursor-pointer">
                💰 Include Smart Budget Breakdown
              </Label>
            </div>
            
            {includeBudget && (
              <div className="space-y-3 mt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetLevel">Budget Level</Label>
                    <select
                      id="budgetLevel"
                      className="w-full p-2 border rounded-md"
                      value={budgetLevel}
                      onChange={(e) => setBudgetLevel(e.target.value as any)}
                    >
                      <option value="budget">Budget ($30-80/day)</option>
                      <option value="mid">Mid-Range ($80-200/day)</option>
                      <option value="luxury">Luxury ($200+/day)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="dailyBudget">
                      Custom Daily Budget (Optional)
                    </Label>
                    <Input
                      id="dailyBudget"
                      type="number"
                      min="0"
                      step="10"
                      placeholder="Auto-calculate based on level"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="text-sm text-purple-700 bg-purple-100 p-2 rounded">
                  <strong>AI will generate:</strong>
                  <ul className="mt-1 list-disc list-inside text-xs">
                    <li>Realistic budget allocation (accommodation, food, activities, transport)</li>
                    <li>Cost estimates for each activity</li>
                    <li>Money-saving tips specific to {city || 'the destination'}</li>
                    <li>Free activity suggestions</li>
                    <li>Budget vs splurge recommendations</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {checkResult && (
          <Alert className={checkResult.exists ? 'border-yellow-200' : 'border-green-200'}>
            <div className="flex items-start gap-2">
              {checkResult.exists ? (
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              )}
              <AlertDescription>
                {checkResult.message}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>How it works:</strong> Enter a city and price. The system will:
          </p>
          <ul className="text-sm text-blue-800 mt-2 list-disc list-inside">
            <li>Determine trip duration based on price ($10-30: 3 days, $31-50: 5 days, $51-75: 7 days, $76+: 10+ days)</li>
            <li>Generate a complete itinerary with daily activities</li>
            <li>Create professional title and description</li>
            <li>Add appropriate tags and images</li>
          </ul>
        </div>

        <Button
          onClick={handleGenerateTemplate}
          disabled={generating || !city.trim() || !price}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Template...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Template
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}