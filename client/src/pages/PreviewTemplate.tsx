import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Map, 
  Plane, 
  Hotel, 
  Utensils, 
  Camera, 
  CreditCard, 
  Users, 
  MessageSquare,
  Clock
} from 'lucide-react';

export default function PreviewTemplate() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="/placeholder-logo.png" 
              alt="Company Logo" 
              className="company-logo h-8 w-auto"
            />
            <span className="company-name text-xl font-bold">NestMap</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-6">
              <a href="#" className="text-sm font-medium hover:text-primary">Dashboard</a>
              <a href="#" className="text-sm font-medium hover:text-primary">Trips</a>
              <a href="#" className="text-sm font-medium hover:text-primary">Bookings</a>
              <a href="#" className="text-sm font-medium hover:text-primary">Reports</a>
            </nav>
            <Avatar>
              <AvatarImage src="/placeholder-avatar.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-primary/5 py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="company-name">NestMap</span> Travel Management
            </h1>
            <p className="text-xl text-muted-foreground company-tagline">
              AI-Powered Corporate Travel Management
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Button size="lg">
                Plan a Trip
              </Button>
              <Button variant="outline" size="lg">
                View Demos
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Travel Management Features</h2>
            <p className="text-muted-foreground mt-2">Everything you need for seamless business travel</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader className="pb-2">
                <Plane className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Flight Booking</CardTitle>
                <CardDescription>Simplified flight booking with AI recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Book flights with our AI-powered system that recommends the best options based on your preferences and company policy.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <Hotel className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Hotel Management</CardTitle>
                <CardDescription>Find and book policy-compliant accommodations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Browse and book hotels that meet your company's requirements and budget constraints.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <Calendar className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Itinerary Planning</CardTitle>
                <CardDescription>AI-optimized travel schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create detailed itineraries with our AI planner that optimizes your schedule for maximum productivity.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CreditCard className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Expense Tracking</CardTitle>
                <CardDescription>Simplified expense management</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Track and manage expenses with automated receipt scanning and policy compliance checks.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <Users className="h-6 w-6 text-primary mb-2" />
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>Real-time travel coordination</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Collaborate with your team in real-time to coordinate travel plans and meetings.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <MessageSquare className="h-6 w-6 text-primary mb-2" />
                <CardTitle>24/7 Support</CardTitle>
                <CardDescription>Always available assistance</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Get help anytime with our 24/7 support team and AI chatbot assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">What Our Clients Say</h2>
            <p className="text-muted-foreground mt-2">Trusted by businesses worldwide</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Jane Doe</p>
                    <p className="text-sm text-muted-foreground">Travel Manager, Acme Inc.</p>
                  </div>
                </div>
                <p className="text-sm">
                  "The AI-powered recommendations have saved us countless hours in planning business trips. Our team loves how easy it is to use."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar>
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">John Smith</p>
                    <p className="text-sm text-muted-foreground">CEO, Tech Solutions</p>
                  </div>
                </div>
                <p className="text-sm">
                  "We've reduced our travel expenses by 30% since implementing this platform. The policy compliance features are outstanding."
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar>
                    <AvatarFallback>AL</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">Amy Lee</p>
                    <p className="text-sm text-muted-foreground">CFO, Global Enterprises</p>
                  </div>
                </div>
                <p className="text-sm">
                  "The expense tracking integration has streamlined our reimbursement process. Our finance team is thrilled with the automation."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/placeholder-logo.png" 
                  alt="Company Logo" 
                  className="company-logo h-8 w-auto"
                />
                <span className="company-name text-xl font-bold">NestMap</span>
              </div>
              <p className="text-sm text-muted-foreground company-tagline">
                AI-Powered Corporate Travel Management
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Integrations</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Case Studies</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Team</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Careers</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Cookie Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">GDPR</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-12 pt-8 text-center">
            <p className="text-sm text-muted-foreground footer-text">
              © 2025 NestMap. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
