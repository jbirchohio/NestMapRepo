import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  Users, 
  CreditCard, 
  Map, 
  Brain, 
  Shield,
  Search,
  Mail,
  Phone,
  Globe,
  ChevronRight
} from 'lucide-react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const { toast } = useToast();

  const faqData = [
    {
      category: 'Getting Started',
      icon: BookOpen,
      questions: [
        {
          question: 'How do I create my first trip?',
          answer: 'Go to the Dashboard and click "Create New Trip". Enter your destination, dates, and preferences. You can either start from scratch or use our AI Trip Generator for automated planning.'
        },
        {
          question: 'What is the AI Trip Generator?',
          answer: 'Our AI Trip Generator creates complete itineraries based on your preferences. Simply describe your trip requirements, and it will suggest activities, accommodations, and transportation options with real pricing data.'
        },
        {
          question: 'How do I invite team members?',
          answer: 'In the Team section, click "Invite Member", enter their email, and select their role. They will receive an invitation email to join your organization.'
        }
      ]
    },
    {
      category: 'Trip Planning',
      icon: Map,
      questions: [
        {
          question: 'Can I collaborate with others on trip planning?',
          answer: 'Yes! You can invite team members to collaborate on trips. Set permissions for viewing, editing, or managing trips based on their role in your organization.'
        },
        {
          question: 'How do I book flights and hotels?',
          answer: 'Use our Bookings section to search for flights and hotels. We integrate with multiple providers to show real-time availability and pricing. Click "Book Now" to complete your reservation.'
        },
        {
          question: 'Can I export my itinerary?',
          answer: 'Yes! You can export trips as PDF proposals for clients, sync to calendar apps (Google, Outlook, Apple), or generate shareable links for team members.'
        }
      ]
    },
    {
      category: 'Business Features',
      icon: Users,
      questions: [
        {
          question: 'What are business trip proposals?',
          answer: 'Create professional PDF proposals for client trips including detailed itineraries, cost breakdowns, and booking options. Perfect for travel agencies and corporate travel managers.'
        },
        {
          question: 'How does role-based access work?',
          answer: 'Assign roles like Admin, Manager, or Member to control who can create trips, manage billing, invite users, and access analytics within your organization.'
        },
        {
          question: 'Can I track expenses and budgets?',
          answer: 'Yes! Set budgets for trips, track expenses by category, and generate expense reports. Our analytics dashboard provides insights into spending patterns.'
        }
      ]
    },
    {
      category: 'Billing & Plans',
      icon: CreditCard,
      questions: [
        {
          question: 'What plans are available?',
          answer: 'We offer three plans: Guest (2 trips, free), Team ($29/month for teams up to 10), and Enterprise ($99/month for unlimited users with advanced features).'
        },
        {
          question: 'Can I change my plan anytime?',
          answer: 'Yes! Upgrade or downgrade your plan anytime. Changes take effect immediately, and billing is prorated.'
        },
        {
          question: 'Is there a free trial?',
          answer: 'All new users get Guest access with 2 free trips. Team and Enterprise plans include a 14-day free trial with full feature access.'
        }
      ]
    },
    {
      category: 'Security & Privacy',
      icon: Shield,
      questions: [
        {
          question: 'How is my data protected?',
          answer: 'We use enterprise-grade encryption, secure authentication, and comply with SOC2 standards. Your trip data is private and never shared with third parties.'
        },
        {
          question: 'Can I delete my account?',
          answer: 'Yes, you can delete your account from Profile Settings. This permanently removes all your data within 30 days as per our privacy policy.'
        },
        {
          question: 'Who can see my trips?',
          answer: 'Only you and invited collaborators can see your trips. Organization admins can see trips created within their organization for billing and management purposes.'
        }
      ]
    }
  ];

  const filteredFAQs = faqData.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // In a real implementation, this would send the message via email or support system
    toast({
      title: "Message Sent",
      description: "We'll get back to you within 24 hours.",
    });
    
    setContactForm({
      name: '',
      email: '',
      subject: '',
      message: '',
      category: 'general'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Help Center
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Get help with NestMap and make the most of your travel planning
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="faq" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">Frequently Asked Questions</TabsTrigger>
            <TabsTrigger value="guides">User Guides</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {filteredFAQs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <HelpCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    No results found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Try a different search term or browse our categories below.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredFAQs.map((category, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <category.icon className="h-5 w-5 text-blue-600" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      {category.questions.map((qa, qaIndex) => (
                        <AccordionItem key={qaIndex} value={`item-${index}-${qaIndex}`}>
                          <AccordionTrigger className="text-left">
                            {qa.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-slate-600 dark:text-slate-400">
                            {qa.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    <Badge variant="secondary">Beginner</Badge>
                  </div>
                  <CardTitle>Quick Start Guide</CardTitle>
                  <CardDescription>
                    Learn the basics of creating and managing trips in NestMap
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Brain className="h-8 w-8 text-purple-600" />
                    <Badge variant="secondary">Intermediate</Badge>
                  </div>
                  <CardTitle>AI Trip Generator</CardTitle>
                  <CardDescription>
                    Master the AI-powered trip planning and optimization features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Users className="h-8 w-8 text-green-600" />
                    <Badge variant="secondary">Advanced</Badge>
                  </div>
                  <CardTitle>Team Collaboration</CardTitle>
                  <CardDescription>
                    Set up organizations, manage roles, and collaborate effectively
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-8 w-8 text-orange-600" />
                    <Badge variant="secondary">Business</Badge>
                  </div>
                  <CardTitle>Client Proposals</CardTitle>
                  <CardDescription>
                    Create professional travel proposals and manage client billing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Map className="h-8 w-8 text-red-600" />
                    <Badge variant="secondary">Feature</Badge>
                  </div>
                  <CardTitle>Booking Integration</CardTitle>
                  <CardDescription>
                    Connect with booking providers and manage reservations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Shield className="h-8 w-8 text-indigo-600" />
                    <Badge variant="secondary">Security</Badge>
                  </div>
                  <CardTitle>Security & Privacy</CardTitle>
                  <CardDescription>
                    Understand our security measures and privacy controls
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Read Guide
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Methods */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Get in Touch</CardTitle>
                    <CardDescription>
                      Choose the best way to reach our support team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Email Support</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          support@nestmap.com
                        </div>
                        <div className="text-xs text-slate-500">
                          Response within 24 hours
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <MessageSquare className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Live Chat</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Available 9 AM - 6 PM EST
                        </div>
                        <div className="text-xs text-slate-500">
                          Instant responses
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Phone className="h-5 w-5 text-purple-600" />
                      <div>
                        <div className="font-medium">Phone Support</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Enterprise customers only
                        </div>
                        <div className="text-xs text-slate-500">
                          Dedicated support line
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <Globe className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="font-medium">Community Forum</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          Ask questions and share tips
                        </div>
                        <div className="text-xs text-slate-500">
                          Peer-to-peer support
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Send a Message</CardTitle>
                  <CardDescription>
                    Describe your issue and we'll get back to you soon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={contactForm.name}
                          onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="w-full mt-1 p-2 border rounded-md"
                        value={contactForm.category}
                        onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                      >
                        <option value="general">General Question</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing & Plans</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        value={contactForm.subject}
                        onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Message</label>
                      <Textarea
                        rows={5}
                        value={contactForm.message}
                        onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Describe your issue or question in detail..."
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full">
                      Send Message
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}