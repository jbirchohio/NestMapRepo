# NestMap Demo Mode Implementation Guide

This document outlines how to implement a separate demo mode for NestMap to allow potential customers to explore the platform without creating an account.

## Overview

The demo mode will provide:
- Instant access with no sign-up required
- Pre-populated sample trips and activities
- Limited but representative feature set
- Clear path to convert to a full account

## Implementation Steps

### 1. Create Demo User and Content

First, create a dedicated demo user and pre-populated content in the database:

```sql
-- Create demo user
INSERT INTO users (
  auth_id, 
  username, 
  email, 
  display_name, 
  avatar_url
) VALUES (
  'demo-user-id', 
  'demo', 
  'demo@nestmap.com', 
  'Demo User', 
  'https://assets.nestmap.com/avatars/demo-avatar.png'
) ON CONFLICT (auth_id) DO NOTHING;

-- Create sample trips
INSERT INTO trips (
  title, 
  start_date, 
  end_date, 
  user_id, 
  city, 
  country, 
  location, 
  is_public,
  collaborators
) VALUES 
('Tokyo Adventure', '2025-06-10', '2025-06-17', (SELECT id FROM users WHERE username = 'demo'), 'Tokyo', 'Japan', 'Tokyo, Japan', true, '[]'),
('Paris Weekend', '2025-07-15', '2025-07-18', (SELECT id FROM users WHERE username = 'demo'), 'Paris', 'France', 'Paris, France', true, '[]'),
('New York Family Trip', '2025-08-20', '2025-08-27', (SELECT id FROM users WHERE username = 'demo'), 'New York', 'USA', 'New York, USA', true, '[]');

-- Add sample activities for Tokyo trip
INSERT INTO activities (
  trip_id, 
  title, 
  date, 
  time, 
  location_name, 
  latitude, 
  longitude, 
  notes, 
  tag, 
  "order", 
  travel_mode
) VALUES 
((SELECT id FROM trips WHERE title = 'Tokyo Adventure' AND user_id = (SELECT id FROM users WHERE username = 'demo')), 'Meiji Shrine Visit', '2025-06-11', '09:00', 'Meiji Shrine', '35.6764', '139.6993', 'Beautiful traditional shrine in forest setting', 'Culture', 1, 'walking'),
((SELECT id FROM trips WHERE title = 'Tokyo Adventure' AND user_id = (SELECT id FROM users WHERE username = 'demo')), 'Sushi Lunch at Tsukiji', '2025-06-11', '12:30', 'Tsukiji Outer Market', '35.6654', '139.7707', 'Famous market with fresh sushi restaurants', 'Food', 2, 'subway'),
((SELECT id FROM trips WHERE title = 'Tokyo Adventure' AND user_id = (SELECT id FROM users WHERE username = 'demo')), 'Shopping in Shibuya', '2025-06-11', '15:00', 'Shibuya Crossing', '35.6591', '139.7005', 'Iconic shopping district and busiest crossing in the world', 'Shopping', 3, 'subway');

-- Add more sample activities for other trips
-- (additional INSERT statements would go here)
```

### 2. Create Demo Mode Authentication Endpoint

Add a special endpoint for accessing demo mode:

```typescript
// server/routes.ts
app.get("/api/demo/login", async (req: Request, res: Response) => {
  try {
    // Get the demo user
    const demoUser = await storage.getUserByUsername("demo");
    
    if (!demoUser) {
      return res.status(404).json({ message: "Demo user not found" });
    }
    
    // Create a special demo session
    req.session.userId = demoUser.id;
    req.session.isDemo = true;
    req.session.demoStartTime = Date.now();
    
    // Return the demo user info
    return res.status(200).json({
      user: {
        id: demoUser.id,
        username: demoUser.username,
        displayName: demoUser.display_name,
        avatarUrl: demoUser.avatar_url,
        isDemo: true
      }
    });
  } catch (error) {
    console.error("Demo login error:", error);
    return res.status(500).json({ message: "Demo login failed" });
  }
});
```

### 3. Add Demo Mode UI Components

Create a demo banner and conversion prompts:

```tsx
// client/src/components/DemoBanner.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function DemoBanner() {
  const { isDemo, demoTimeRemaining, openAuthModal } = useAuth();
  
  if (!isDemo) return null;
  
  return (
    <div className="bg-primary text-white p-2 flex justify-between items-center fixed bottom-0 left-0 right-0 z-50">
      <div>
        <span className="font-bold">Demo Mode</span>
        <span className="ml-2">Exploring NestMap's features</span>
        {demoTimeRemaining && (
          <span className="ml-2 text-primary-foreground/80">
            {Math.floor(demoTimeRemaining / 60)}:{(demoTimeRemaining % 60).toString().padStart(2, '0')} remaining
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-white border-white hover:bg-white hover:text-primary"
          onClick={() => openAuthModal('signup')}
        >
          Create Free Account
        </Button>
        <Button 
          variant="secondary" 
          size="sm"
          onClick={() => openAuthModal('login')}
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}
```

### 4. Implement Demo Mode Session Management

Modify the authentication context to handle demo sessions:

```tsx
// client/src/contexts/AuthContext.tsx
// Add to existing AuthContext

const [isDemo, setIsDemo] = useState<boolean>(false);
const [demoStartTime, setDemoStartTime] = useState<number | null>(null);
const [demoTimeRemaining, setDemoTimeRemaining] = useState<number | null>(null);

// Demo session duration in minutes
const DEMO_SESSION_DURATION = 30;

// Function to start demo mode
const startDemoMode = async () => {
  try {
    const response = await fetch('/api/demo/login');
    if (!response.ok) throw new Error('Demo login failed');
    
    const data = await response.json();
    setUser(data.user);
    setIsDemo(true);
    setDemoStartTime(Date.now());
    
    // Set a timer to count down demo time
    const intervalId = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - demoStartTime!) / 1000);
      const remaining = DEMO_SESSION_DURATION * 60 - elapsed;
      
      if (remaining <= 0) {
        clearInterval(intervalId);
        endDemoMode();
      } else {
        setDemoTimeRemaining(remaining);
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error starting demo mode:', error);
    return false;
  }
};

// Function to end demo mode
const endDemoMode = () => {
  setUser(null);
  setIsDemo(false);
  setDemoStartTime(null);
  setDemoTimeRemaining(null);
  
  // Clear the demo session
  fetch('/api/auth/logout', { method: 'POST' });
};

// Add these to the context value
const authContextValue = {
  // ... existing values
  isDemo,
  demoTimeRemaining,
  startDemoMode,
  endDemoMode
};
```

### 5. Add Demo Button to Landing Page

Update the landing page to include a prominent "Try Demo" button:

```tsx
// client/src/pages/LandingPage.tsx
// Add to existing landing page component

<div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
  <Button 
    size="lg" 
    onClick={() => openAuthModal('signup')}
  >
    Get Started Free
  </Button>
  <Button
    size="lg"
    variant="outline"
    onClick={() => startDemoMode()}
  >
    Try Demo
  </Button>
</div>
```

### 6. Implement Demo Mode Restrictions

Create middleware to restrict certain actions in demo mode:

```typescript
// server/middleware/demoMode.ts
import { Request, Response, NextFunction } from 'express';

export const demoModeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if in demo mode
  if (req.session.isDemo) {
    // Allow read operations
    if (req.method === 'GET') {
      return next();
    }
    
    // Restrict certain operations in demo mode
    if (
      req.path.includes('/api/trips') && (req.method === 'DELETE' || req.method === 'PUT') ||
      req.path.includes('/api/users') ||
      req.path.includes('/api/auth') ||
      req.method === 'POST' && req.path.includes('/api/activities') && req.body.activities?.length > 3
    ) {
      return res.status(403).json({
        message: 'This action is not available in demo mode. Sign up for a free account to access all features.',
        isDemo: true
      });
    }
    
    // Allow limited number of activities to be added in demo
    if (req.method === 'POST' && req.path.includes('/api/activities')) {
      // Check number of existing activities for this demo user
      const storage = req.app.locals.storage;
      const userId = req.session.userId;
      
      // Implement a check to limit number of activities
      // This is simplified - actual implementation would need to be adjusted based on your storage layer
      storage.getActivitiesByUserId(userId).then(activities => {
        if (activities.length >= 10) {
          return res.status(403).json({
            message: 'Demo mode is limited to 10 activities. Sign up for a free account to create unlimited activities.',
            isDemo: true
          });
        } else {
          return next();
        }
      }).catch(err => {
        console.error('Error checking demo activities limit:', err);
        return next();
      });
    } else {
      return next();
    }
  } else {
    return next();
  }
};

// Add to server/index.ts or wherever middleware is configured
app.use(demoModeMiddleware);
```

### 7. Add Demo Mode API Endpoints

Create endpoints to manage demo sessions:

```typescript
// server/routes.ts
// Add these routes

// Check demo status
app.get("/api/demo/status", (req: Request, res: Response) => {
  if (req.session.isDemo) {
    const now = Date.now();
    const elapsed = Math.floor((now - req.session.demoStartTime) / 1000);
    const remaining = 30 * 60 - elapsed; // 30 minutes demo
    
    return res.json({
      isDemo: true,
      timeRemaining: remaining > 0 ? remaining : 0
    });
  } else {
    return res.json({ isDemo: false });
  }
});

// End demo mode
app.post("/api/demo/end", (req: Request, res: Response) => {
  if (req.session.isDemo) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error ending demo session:", err);
        return res.status(500).json({ message: "Failed to end demo session" });
      }
      
      return res.json({ message: "Demo session ended" });
    });
  } else {
    return res.status(400).json({ message: "Not in demo mode" });
  }
});
```

### 8. Create Demo Mode Info Tooltips

Add tooltips to explain limitations in demo mode:

```tsx
// client/src/components/DemoFeatureTooltip.tsx
import React from 'react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DemoFeatureTooltipProps {
  feature: string;
  limitation: string;
  children: React.ReactNode;
}

export default function DemoFeatureTooltip({ 
  feature, 
  limitation, 
  children 
}: DemoFeatureTooltipProps) {
  const { isDemo, openAuthModal } = useAuth();
  
  if (!isDemo) return <>{children}</>;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <span className="absolute -top-1 -right-1 text-primary">
              <Info size={16} />
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p><strong>{feature}</strong> has limitations in demo mode:</p>
          <p className="text-sm text-muted-foreground">{limitation}</p>
          <button 
            className="text-xs text-primary mt-2"
            onClick={() => openAuthModal('signup')}
          >
            Sign up for full access
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### 9. Add Demo Conversion Points

Add strategic conversion CTAs throughout the demo experience:

```tsx
// client/src/components/DemoConversionPrompt.tsx
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface DemoConversionPromptProps {
  trigger: 'activity_limit' | 'feature_locked' | 'time_expiring' | 'demo_end';
  feature?: string;
}

export default function DemoConversionPrompt({ 
  trigger,
  feature 
}: DemoConversionPromptProps) {
  const { openAuthModal } = useAuth();
  
  const messages = {
    activity_limit: {
      title: "You've reached the demo activity limit",
      description: "Sign up for a free account to create unlimited activities and trips.",
    },
    feature_locked: {
      title: `${feature} is not available in demo mode`,
      description: "Create a free account to access all NestMap features.",
    },
    time_expiring: {
      title: "Your demo is about to expire",
      description: "Don't lose your progress! Create an account to save your work.",
    },
    demo_end: {
      title: "Your demo has ended",
      description: "Thanks for trying NestMap! Sign up now to continue planning amazing trips.",
    }
  };
  
  const message = messages[trigger];
  
  return (
    <Card className="shadow-lg border-primary/20 max-w-md mx-auto">
      <CardContent className="pt-6">
        <h3 className="text-xl font-bold">{message.title}</h3>
        <p className="text-muted-foreground mt-2">{message.description}</p>
      </CardContent>
      <CardFooter className="flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={() => openAuthModal('login')}
        >
          Sign In
        </Button>
        <Button 
          onClick={() => openAuthModal('signup')}
        >
          Create Free Account
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### 10. Implement Demo Data Reset

Add a mechanism to reset demo data daily:

```typescript
// scripts/reset-demo-data.js
const { db } = require('../server/db');
const { eq } = require('drizzle-orm');
const { users, trips, activities } = require('../shared/schema');

async function resetDemoData() {
  console.log('Starting demo data reset...');
  
  try {
    // Get demo user ID
    const [demoUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, 'demo'));
    
    if (!demoUser) {
      console.error('Demo user not found');
      return;
    }
    
    // Delete all user-created activities
    const deletedActivities = await db
      .delete(activities)
      .where(
        eq(activities.tripId, 
          db.select({ id: trips.id })
            .from(trips)
            .where(eq(trips.userId, demoUser.id))
        )
      )
      .returning();
    
    console.log(`Deleted ${deletedActivities.length} user-created activities`);
    
    // Delete all user-created trips except the sample ones
    const deletedTrips = await db
      .delete(trips)
      .where(
        eq(trips.userId, demoUser.id)
      )
      .returning();
    
    console.log(`Deleted ${deletedTrips.length} user-created trips`);
    
    // Re-run the sample data creation script
    // This would re-insert the predefined demo content
    // (You would call the SQL setup script here)
    
    console.log('Demo data reset complete');
  } catch (error) {
    console.error('Error resetting demo data:', error);
  }
}

// Run the reset
resetDemoData();
```

### 11. Track Demo Mode Analytics

Add analytics to track demo usage and conversion:

```typescript
// client/src/hooks/useAnalytics.ts
export const useAnalytics = () => {
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    // This would connect to your analytics provider
    // For example, using Segment, Mixpanel, or Google Analytics
    console.log('Tracking event:', eventName, properties);
    
    // Example implementation with a hypothetical analytics API
    if (window.analytics) {
      window.analytics.track(eventName, properties);
    }
  };
  
  const trackDemoEvents = {
    started: () => trackEvent('demo_started'),
    action: (action: string) => trackEvent('demo_action', { action }),
    conversionPromptShown: (trigger: string) => trackEvent('demo_conversion_prompt', { trigger }),
    conversionClicked: (trigger: string) => trackEvent('demo_conversion_clicked', { trigger }),
    ended: (timeSpent: number, reason: 'expired' | 'converted' | 'closed') => 
      trackEvent('demo_ended', { timeSpent, reason })
  };
  
  return {
    trackEvent,
    trackDemoEvents
  };
};
```

## Testing the Demo Mode

1. Ensure all demo mode routes and components work correctly
2. Test demo mode restrictions to verify limitations work as expected
3. Test conversion points to make sure they display correctly
4. Verify demo session expiration works properly
5. Check that demo data reset process works correctly

## Deployment Considerations

1. Create a cron job to reset demo data daily
2. Monitor demo mode usage to optimize the experience
3. A/B test different demo limitations and conversion prompts
4. Consider adjusting the demo duration based on user engagement data