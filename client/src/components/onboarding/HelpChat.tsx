import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X,
  Lightbulb,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface HelpChatProps {
  open: boolean;
  onClose: () => void;
  floatingButton?: boolean;
}

// Context-aware help content based on onboarding step
const STEP_HELP_CONTENT: Record<string, {
  title: string;
  quickHelp: string;
  suggestions: string[];
  faqs: Array<{ question: string; answer: string }>;
}> = {
  connect_systems: {
    title: 'System Integration Help',
    quickHelp: 'Connect your HR and Finance systems to automatically sync employee data and manage budgets.',
    suggestions: [
      'How do I connect Workday?',
      'What data gets synced?',
      'Is my data secure?',
      'Troubleshoot connection issues'
    ],
    faqs: [
      {
        question: 'How do I connect my HR system?',
        answer: 'Select your HR platform from the dropdown, enter your API credentials, and click "Test Connection". We support Workday, BambooHR, ADP, and SAP SuccessFactors.'
      },
      {
        question: 'What employee data gets synced?',
        answer: 'We sync basic employee information (name, email, department, manager), cost centers, and approval hierarchies. Sensitive data like salaries are never accessed.'
      },
      {
        question: 'How secure is the integration?',
        answer: 'All connections use enterprise-grade encryption (TLS 1.3), OAuth 2.0 authentication, and are SOC 2 Type II compliant. Data is encrypted at rest and in transit.'
      }
    ]
  },
  invite_team: {
    title: 'Team Invitation Help',
    quickHelp: 'Add team members to your organization so they can start booking and managing travel.',
    suggestions: [
      'How to bulk invite users?',
      'Set user roles and permissions',
      'Resend invitation emails',
      'Import from CSV file'
    ],
    faqs: [
      {
        question: 'How do I bulk invite team members?',
        answer: 'Use the "Bulk Import" feature to upload a CSV file with columns: email, name, role, department. Download our template for the correct format.'
      },
      {
        question: 'What are the different user roles?',
        answer: 'Admin: Full system access. Travel Manager: Approve requests and view reports. Traveler: Book trips and manage expenses. You can customize permissions for each role.'
      }
    ]
  },
  view_dashboard: {
    title: 'Dashboard Navigation Help',
    quickHelp: 'Your dashboard shows pending approvals, spending analytics, and team travel activity.',
    suggestions: [
      'Understanding the metrics',
      'Customize dashboard widgets',
      'Set up alerts and notifications',
      'Export dashboard data'
    ],
    faqs: [
      {
        question: 'What do the dashboard metrics mean?',
        answer: 'Pending Requests: Travel requests awaiting approval. Monthly Spend: Current month expenses vs budget. Policy Compliance: Percentage of bookings within policy. Savings: Cost reductions from policy compliance.'
      }
    ]
  },
  sync_calendar: {
    title: 'Calendar Integration Help',
    quickHelp: 'Connect your calendar to avoid scheduling conflicts and automatically sync travel dates.',
    suggestions: [
      'Connect Google Calendar',
      'Connect Outlook Calendar',
      'Privacy and permissions',
      'Sync troubleshooting'
    ],
    faqs: [
      {
        question: 'Which calendars are supported?',
        answer: 'We support Google Calendar, Microsoft Outlook, Apple iCloud, and any CalDAV-compatible calendar. Enterprise calendars like Exchange are also supported.'
      },
      {
        question: 'What calendar data do you access?',
        answer: 'We only read event dates and times to check for conflicts. Event titles, descriptions, and attendees are never accessed to protect your privacy.'
      }
    ]
  }
};

export const HelpChat: React.FC<HelpChatProps> = ({
  open,
  onClose,
  floatingButton = false
}) => {
  const { flow, trackEvent } = useOnboarding();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentStep = flow?.steps[flow.currentStepIndex];
  const stepHelp = currentStep ? STEP_HELP_CONTENT[currentStep.id] : null;

  // Initialize with welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: stepHelp 
          ? `Hi! I'm here to help with ${stepHelp.title.toLowerCase()}. ${stepHelp.quickHelp}`
          : "Hi! I'm your NestMap assistant. How can I help you with your setup today?",
        timestamp: new Date(),
        suggestions: stepHelp?.suggestions || [
          'Getting started guide',
          'Common setup issues',
          'Contact support',
          'Feature overview'
        ]
      };
      setMessages([welcomeMessage]);
      
      trackEvent('help_chat_opened', { 
        currentStep: currentStep?.id,
        role: flow?.role 
      });
    }
  }, [open, messages.length, stepHelp, currentStep, flow, trackEvent]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    trackEvent('help_chat_message_sent', { 
      message: content,
      currentStep: currentStep?.id 
    });

    try {
      // Simulate AI response (in production, integrate with OpenAI or your AI service)
      const response = await generateAIResponse(content, currentStep?.id);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response.content,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      trackEvent('help_chat_response_received', { 
        userMessage: content,
        responseLength: response.content.length 
      });
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again or contact our support team for immediate assistance.",
        timestamp: new Date(),
        suggestions: ['Contact support', 'Try again', 'View documentation']
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Mock AI response generator (replace with actual OpenAI integration)
  const generateAIResponse = async (userMessage: string, stepId?: string): Promise<{
    content: string;
    suggestions: string[];
  }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerMessage = userMessage.toLowerCase();
    
    // Context-aware responses based on current step
    if (stepId && stepHelp) {
      const relevantFaq = stepHelp.faqs.find(faq => 
        lowerMessage.includes(faq.question.toLowerCase().split(' ')[0]) ||
        faq.question.toLowerCase().includes(lowerMessage.split(' ')[0])
      );
      
      if (relevantFaq) {
        return {
          content: relevantFaq.answer,
          suggestions: stepHelp.suggestions.filter(s => s !== userMessage)
        };
      }
    }

    // General responses
    if (lowerMessage.includes('connect') || lowerMessage.includes('integration')) {
      return {
        content: "To connect your systems, go to the Integration tab, select your platform, and follow the setup wizard. Make sure you have admin credentials for your HR/Finance system.",
        suggestions: ['What credentials do I need?', 'Troubleshoot connection', 'Security information']
      };
    }

    if (lowerMessage.includes('invite') || lowerMessage.includes('team')) {
      return {
        content: "You can invite team members individually or use bulk import. Each user will receive an email invitation with setup instructions.",
        suggestions: ['Bulk import process', 'User roles explained', 'Resend invitations']
      };
    }

    if (lowerMessage.includes('calendar')) {
      return {
        content: "Calendar integration helps prevent double-booking and automatically syncs your travel dates. We support Google Calendar, Outlook, and other major providers.",
        suggestions: ['Setup Google Calendar', 'Privacy settings', 'Sync troubleshooting']
      };
    }

    // Default response
    return {
      content: "I'd be happy to help! Could you be more specific about what you're trying to do? I can assist with system setup, integrations, user management, and general platform questions.",
      suggestions: ['System integration help', 'User management', 'Booking assistance', 'Contact support']
    };
  };

  if (floatingButton && !open) {
    return (
      <Button
        onClick={() => {/* This would be handled by parent component */}}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="lg"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle>NestMap Assistant</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {stepHelp ? stepHelp.title : 'How can I help you today?'}
                </p>
              </div>
            </div>
            {currentStep && (
              <Badge variant="outline" className="flex items-center gap-1">
                {currentStep.completed ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : currentStep.required ? (
                  <AlertCircle className="h-3 w-3 text-orange-500" />
                ) : (
                  <Clock className="h-3 w-3 text-blue-500" />
                )}
                {currentStep.title}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                  <Card className={`${
                    message.type === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <CardContent className="p-3">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <Lightbulb className="h-3 w-3 mr-1" />
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="flex-shrink-0 p-2 bg-primary rounded-full h-fit order-1">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="bg-muted">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything about NestMap setup..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send • Powered by AI
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HelpChat;
