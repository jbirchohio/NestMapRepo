import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingDown, TrendingUp, Clock, Users, Cloud, Sun, CloudRain, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface PredictiveInsightsProps {
  tripId: number;
  destination: string;
  departureDate: string;
  returnDate?: string;
  activities: any[];
}

export default function PredictiveInsights({ 
  tripId, 
  destination, 
  departureDate, 
  returnDate,
  activities 
}: PredictiveInsightsProps) {
  const [selectedTab, setSelectedTab] = useState('pricing');

  // Fetch predictive data
  const { data: pricePrediction, isLoading: priceLoading } = useQuery({
    queryKey: ['/api/predict/prices', destination, departureDate, returnDate],
    enabled: !!destination && !!departureDate
  });

  const { data: crowdPrediction, isLoading: crowdLoading } = useQuery({
    queryKey: ['/api/predict/crowds', destination, departureDate],
    enabled: !!destination && !!departureDate
  });

  const { data: weatherAdaptation, isLoading: weatherLoading } = useQuery({
    queryKey: ['/api/predict/weather', destination, departureDate, activities],
    enabled: !!destination && !!departureDate && activities.length > 0
  });

  const { data: optimization, isLoading: optimizationLoading } = useQuery({
    queryKey: ['/api/predict/optimize', tripId],
    enabled: !!tripId
  });

  if (priceLoading || crowdLoading || weatherLoading || optimizationLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            AI Insights Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-600" />
          AI Predictive Insights
        </CardTitle>
        <CardDescription>
          Smart recommendations based on real-time data and AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="crowds">Crowds</TabsTrigger>
            <TabsTrigger value="weather">Weather</TabsTrigger>
            <TabsTrigger value="optimization">Optimize</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="space-y-4">
            <PricingInsights data={pricePrediction} />
          </TabsContent>

          <TabsContent value="crowds" className="space-y-4">
            <CrowdInsights data={crowdPrediction} activities={activities} />
          </TabsContent>

          <TabsContent value="weather" className="space-y-4">
            <WeatherInsights data={weatherAdaptation} />
          </TabsContent>

          <TabsContent value="optimization" className="space-y-4">
            <OptimizationInsights data={optimization} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PricingInsights({ data }: { data: any }) {
  if (!data) return <div>No pricing data available</div>;

  const { currentPrice, predictedPrices, optimalBookingWindow, seasonalTrends } = data;
  const savings = optimalBookingWindow?.expectedSavings || 0;
  const recommendation = predictedPrices?.[0]?.recommendation || 'monitor';

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'book_now': return 'text-green-600 bg-green-50 border-green-200';
      case 'wait': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'book_now': return <CheckCircle className="w-4 h-4" />;
      case 'wait': return <TrendingDown className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Alert className={getRecommendationColor(recommendation)}>
        <div className="flex items-center gap-2">
          {getRecommendationIcon(recommendation)}
          <AlertDescription className="font-medium">
            {recommendation === 'book_now' && 'Excellent time to book! Prices are likely to increase.'}
            {recommendation === 'wait' && 'Consider waiting. Prices may drop in the coming weeks.'}
            {recommendation === 'monitor' && 'Keep monitoring. Prices are stable but may change.'}
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${currentPrice}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Current Price</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">${savings}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Potential Savings</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {optimalBookingWindow?.start ? new Date(optimalBookingWindow.start).toLocaleDateString() : 'N/A'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Optimal Booking Date</p>
          </CardContent>
        </Card>
      </div>

      {predictedPrices && predictedPrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Price Trends (Next 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={predictedPrices.slice(0, 30)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CrowdInsights({ data, activities }: { data: any; activities: any[] }) {
  if (!data) return <div>No crowd data available</div>;

  const { crowdLevel, confidence, peakHours, bestVisitTimes, alternativeOptions } = data;

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'extreme': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCrowdIcon = (level: string) => {
    switch (level) {
      case 'low': return <Users className="w-4 h-4" />;
      case 'medium': return <Users className="w-4 h-4" />;
      case 'high': return <Users className="w-4 h-4" />;
      case 'extreme': return <AlertTriangle className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <Alert className={getCrowdColor(crowdLevel)}>
        <div className="flex items-center gap-2">
          {getCrowdIcon(crowdLevel)}
          <AlertDescription className="font-medium">
            Expected crowd level: <strong>{crowdLevel.toUpperCase()}</strong> 
            <span className="ml-2 text-sm">({Math.round(confidence * 100)}% confidence)</span>
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Best Visit Times</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bestVisitTimes?.map((time: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <div className="font-medium">{time.time}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{time.reason}</div>
                  </div>
                  <Badge className={getCrowdColor(time.crowdLevel)}>
                    {time.crowdLevel}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Peak Hours to Avoid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {peakHours?.map((hour: string, index: number) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-medium">{hour}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">High crowds expected</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {alternativeOptions && alternativeOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Less Crowded Alternatives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alternativeOptions.map((option: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{option.distance} away</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getCrowdColor(option.crowdLevel)}>
                      {option.crowdLevel}
                    </Badge>
                    <span className="text-sm text-gray-500">{Math.round(option.similarity * 100)}% similar</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeatherInsights({ data }: { data: any }) {
  if (!data) return <div>No weather data available</div>;

  const { weatherForecast, indoorAlternatives, adaptedPlan } = data;

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'rain':
      case 'rainy':
        return <CloudRain className="w-5 h-5 text-blue-500" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {weatherForecast?.map((day: any, index: number) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                {getWeatherIcon(day.condition)}
              </div>
              <div className="text-2xl font-bold">{day.temperature}°C</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">{day.condition}</div>
              {day.precipitation > 0 && (
                <div className="text-sm text-blue-600 mt-1">{day.precipitation}mm rain</div>
              )}
              <div className="mt-2 text-xs text-gray-500">{day.recommendation}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {indoorAlternatives && indoorAlternatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CloudRain className="w-5 h-5" />
              Indoor Alternatives (Bad Weather Backup)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {indoorAlternatives.map((alternative: any, index: number) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="font-medium">{alternative.title}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">{alternative.reason}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OptimizationInsights({ data }: { data: any }) {
  if (!data) return <div>No optimization data available</div>;

  const { budgetOptimization, timeOptimization, experienceOptimization } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-600" />
              Budget Savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${budgetOptimization?.savings || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {Math.round(((budgetOptimization?.savings || 0) / (budgetOptimization?.originalCost || 1)) * 100)}% saved
            </div>
            <Progress 
              value={((budgetOptimization?.savings || 0) / (budgetOptimization?.originalCost || 1)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Time Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {timeOptimization?.timeSaved || 0}h
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              More efficient planning
            </div>
            <Progress 
              value={((timeOptimization?.timeSaved || 0) / (timeOptimization?.originalDuration || 1)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Experience Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {experienceOptimization?.satisfactionScore || 0}/10
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Satisfaction rating
            </div>
            <Progress 
              value={(experienceOptimization?.satisfactionScore || 0) * 10} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recommended Optimizations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {budgetOptimization?.recommendations?.map((rec: string, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personalized Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {experienceOptimization?.personalizedSuggestions?.map((suggestion: string, index: number) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                  <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
