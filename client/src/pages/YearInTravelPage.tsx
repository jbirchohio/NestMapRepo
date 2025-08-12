import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import YearInTravel from '@/components/YearInTravel';
import AppShell from '@/components/AppShell';
import { Calendar, TrendingUp, Globe, Sparkles } from 'lucide-react';
import { useLocation } from 'wouter';
import { jwtAuth } from '@/lib/jwtAuth';

export default function YearInTravelPage() {
  const [, setLocation] = useLocation();
  const [showRecap, setShowRecap] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const user = jwtAuth.getUser();

  // Check if we're in the last 2 weeks of the year
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentDay = now.getDate();
  const isUnlocked = currentMonth === 11 && currentDay >= 18; // December 18th onwards

  if (!user) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full p-8 text-center">
            <Globe className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Sign In to See Your Travel Wrapped</h2>
            <p className="text-muted-foreground mb-6">
              Discover your travel personality and relive your adventures from the past year!
            </p>
            <Button onClick={() => setLocation('/login')} size="lg" className="w-full">
              Sign In
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (showRecap) {
    return (
      <YearInTravel 
        year={selectedYear} 
        onClose={() => setShowRecap(false)} 
      />
    );
  }

  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear, currentYear - 1, currentYear - 2];

  // Show locked state if not in last 2 weeks of year
  if (!isUnlocked) {
    const daysUntilUnlock = Math.ceil((new Date(currentYear, 11, 18).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full p-8 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-4">Your Year in Travel</h2>
            <p className="text-muted-foreground mb-6">
              Your travel recap will be available on December 18th!
            </p>
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 mb-6">
              <p className="text-lg font-semibold text-purple-900">
                {daysUntilUnlock} days to go!
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Come back in the last two weeks of the year to see your personalized travel story.
            </p>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Your Year in Travel
            </h1>
            <p className="text-xl text-muted-foreground">
              Discover your travel personality and relive your adventures
            </p>
          </div>

          {/* Year Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {availableYears.map((year) => (
              <Card 
                key={year}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedYear(year);
                  setShowRecap(true);
                }}
              >
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl font-bold mb-2">{year}</h3>
                  <p className="text-muted-foreground">View your travel story</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <TrendingUp className="w-10 h-10 mb-4 text-blue-600" />
              <h3 className="font-semibold mb-2">Travel Stats</h3>
              <p className="text-sm text-muted-foreground">
                See how many trips, countries, and cities you explored
              </p>
            </Card>
            
            <Card className="p-6">
              <Sparkles className="w-10 h-10 mb-4 text-purple-600" />
              <h3 className="font-semibold mb-2">Travel Personality</h3>
              <p className="text-sm text-muted-foreground">
                Discover your unique travel style and personality
              </p>
            </Card>
            
            <Card className="p-6">
              <Globe className="w-10 h-10 mb-4 text-green-600" />
              <h3 className="font-semibold mb-2">Fun Facts</h3>
              <p className="text-sm text-muted-foreground">
                Surprising insights about your travel habits
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Card className="inline-block p-8 bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="text-2xl font-bold mb-4">Ready for Your Next Adventure?</h2>
              <p className="text-muted-foreground mb-6">
                Plan your next trip and make {currentYear + 1} even more amazing!
              </p>
              <Button 
                size="lg"
                onClick={() => setLocation('/')}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
              >
                Start Planning
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}