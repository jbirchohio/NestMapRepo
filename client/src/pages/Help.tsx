import React from 'react';
import { 
  HelpCircle, Search, BookOpen, Users, CreditCard, Map, 
  Share2, ShoppingBag, Settings, Shield, ChevronDown, ChevronRight,
  Plane, Hotel, Calendar, Navigation, Star, DollarSign
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function HelpPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const categories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      description: 'Learn the basics of using Remvana',
      faqs: [
        {
          question: 'How do I create my first trip?',
          answer: 'Click the "New Trip" button in your dashboard. Enter your destination, dates, and trip name. That\'s it! You can start adding activities right away.'
        },
        {
          question: 'Can I plan a trip with friends?',
          answer: 'Yes! After creating a trip, click "Share" and send the link to your friends. They can view or collaborate based on the permissions you set.'
        },
        {
          question: 'Is Remvana free to use?',
          answer: 'Yes! Basic trip planning is completely free. You only pay if you purchase premium templates from our marketplace.'
        },
        {
          question: 'Do I need to create an account?',
          answer: 'You need an account to save trips and access all features. Sign up is free and takes less than a minute!'
        }
      ]
    },
    {
      id: 'trips',
      title: 'Trips & Planning',
      icon: Map,
      description: 'Everything about planning your perfect trip',
      faqs: [
        {
          question: 'How do I add activities to my trip?',
          answer: 'Open your trip and click "Add Activity". You can search for popular activities, enter custom ones, or browse suggestions based on your destination.'
        },
        {
          question: 'Can I change my trip dates?',
          answer: 'Yes! Click on your trip settings and update the dates. Your activities will automatically adjust to the new timeline.'
        },
        {
          question: 'How do I organize my daily itinerary?',
          answer: 'Drag and drop activities to reorder them. You can also assign specific times and add travel time between locations.'
        },
        {
          question: 'Can I duplicate a trip?',
          answer: 'Yes! Open the trip menu and select "Duplicate". This creates a copy you can modify for a similar trip.'
        },
        {
          question: 'How do I add notes to my trip?',
          answer: 'Each trip has a Notes section where you can add important information, packing lists, or travel tips.'
        }
      ]
    },
    {
      id: 'templates',
      title: 'Template Marketplace',
      icon: ShoppingBag,
      description: 'Buy and sell travel templates',
      faqs: [
        {
          question: 'What are trip templates?',
          answer: 'Templates are pre-planned trips created by experienced travelers and local experts. Buy once, customize forever!'
        },
        {
          question: 'How do I purchase a template?',
          answer: 'Browse the marketplace, find a template you like, and click "Buy Now". Payment is secure through Stripe.'
        },
        {
          question: 'Can I customize a template after buying?',
          answer: 'Absolutely! Once purchased, the template becomes your trip. Add, remove, or modify anything you want.'
        },
        {
          question: 'How do I become a template creator?',
          answer: 'Create an amazing trip, then click "Sell as Template" in your trip settings. Set your price and description.'
        },
        {
          question: 'What commission does Remvana take?',
          answer: 'We take a 30% commission on template sales. You keep 70% of every sale!'
        },
        {
          question: 'When do I get paid for template sales?',
          answer: 'Payouts are processed monthly. You need a minimum balance of $50 for payout.'
        }
      ]
    },
    {
      id: 'sharing',
      title: 'Sharing & Collaboration',
      icon: Share2,
      description: 'Share trips with friends and family',
      faqs: [
        {
          question: 'How do I share my trip?',
          answer: 'Click the "Share" button on your trip. Copy the link and send it to anyone. They don\'t need an account to view!'
        },
        {
          question: 'Can others edit my shared trip?',
          answer: 'Only if you give them "edit" permissions. By default, shared trips are view-only.'
        },
        {
          question: 'How do I stop sharing a trip?',
          answer: 'Go to trip settings and toggle off "Enable sharing". The link will stop working immediately.'
        },
        {
          question: 'Can I see who viewed my shared trip?',
          answer: 'Currently, we don\'t track individual views, but you can see total view count.'
        }
      ]
    },
    {
      id: 'bookings',
      title: 'Bookings & Activities',
      icon: Calendar,
      description: 'Book activities and accommodations',
      faqs: [
        {
          question: 'Can I book activities through Remvana?',
          answer: 'Yes! We partner with Viator to offer thousands of bookable activities. Look for the "Book Now" button.'
        },
        {
          question: 'Are activity prices competitive?',
          answer: 'Our partner prices are the same as booking directly. Sometimes you\'ll even find exclusive deals!'
        },
        {
          question: 'Can I cancel a booking?',
          answer: 'Cancellation policies vary by activity. Check the specific terms before booking.'
        },
        {
          question: 'Do creators earn from my bookings?',
          answer: 'If you book through a purchased template, the creator may earn a small commission (at no extra cost to you).'
        }
      ]
    },
    {
      id: 'account',
      title: 'Account & Settings',
      icon: Settings,
      description: 'Manage your account and preferences',
      faqs: [
        {
          question: 'How do I change my password?',
          answer: 'Go to Settings > Security > Change Password. You\'ll need your current password to set a new one.'
        },
        {
          question: 'Can I change my username?',
          answer: 'Yes! Go to Settings > Profile > Edit Username. Note: this may affect your template store URL.'
        },
        {
          question: 'How do I delete my account?',
          answer: 'Go to Settings > Account > Delete Account. This action is permanent and cannot be undone.'
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes! Go to Settings > Privacy > Export Data. You\'ll receive a download link via email.'
        }
      ]
    },
    {
      id: 'payments',
      title: 'Payments & Billing',
      icon: CreditCard,
      description: 'Payment questions and billing help',
      faqs: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards, debit cards, and digital wallets through Stripe.'
        },
        {
          question: 'Is my payment information secure?',
          answer: 'Yes! We use Stripe for secure payment processing. We never store your card details.'
        },
        {
          question: 'Can I get a refund for a template?',
          answer: 'Template sales are final. Make sure to review the template details before purchasing.'
        },
        {
          question: 'How do I update my payment method?',
          answer: 'Go to Settings > Billing > Payment Methods to add or update your cards.'
        },
        {
          question: 'Do prices include tax?',
          answer: 'Prices shown are before tax. Applicable taxes are calculated at checkout based on your location.'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: Shield,
      description: 'Keep your information safe',
      faqs: [
        {
          question: 'Is my trip data private?',
          answer: 'Yes! Your trips are private by default. Only you can see them unless you choose to share.'
        },
        {
          question: 'Do you sell my data?',
          answer: 'Never! We don\'t sell your personal information to anyone. See our Privacy Policy for details.'
        },
        {
          question: 'How do I make my profile private?',
          answer: 'Go to Settings > Privacy and adjust your visibility settings.'
        },
        {
          question: 'Can I use Remvana anonymously?',
          answer: 'You need an email to sign up, but you can use any username and don\'t have to share personal details.'
        }
      ]
    }
  ];

  const filteredCategories = searchQuery
    ? categories.map(cat => ({
        ...cat,
        faqs: cat.faqs.filter(faq => 
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.faqs.length > 0)
    : categories;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <HelpCircle className="h-16 w-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help?</h1>
          <p className="text-xl text-gray-600 mb-8">
            Find answers to common questions or contact our support team
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search for help..."
              className="pl-10 pr-4 py-6 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Links */}
        {!searchQuery && (
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Plane className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">First Trip</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Templates</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Sharing</CardTitle>
              </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-lg">Payments</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-purple-600" />
                    {category.title}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {category.faqs.map((faq, index) => (
                      <AccordionItem key={index} value={`${category.id}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-600">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Still Need Help */}
        <div className="mt-16 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Still need help?</CardTitle>
              <CardDescription>Our support team is here for you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold mb-1">Email Support</h3>
                <p className="text-sm text-gray-600">admin@remvana.com</p>
                <p className="text-xs text-gray-500">We'll respond within 24 hours</p>
              </div>
              <div className="pt-4">
                <a 
                  href="/contact" 
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-purple-600 text-white hover:bg-purple-700 h-10 px-4 py-2"
                >
                  Contact Support
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Popular Articles */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Popular Articles</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Getting Started Guide</CardTitle>
                <CardDescription>Everything you need to plan your first trip</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Template Creator Guide</CardTitle>
                <CardDescription>Learn how to earn by selling templates</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">Collaboration Tips</CardTitle>
                <CardDescription>Plan trips together with friends</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
    </div>
  );
}