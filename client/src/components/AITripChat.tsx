import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Send,
  Sparkles,
  Loader2,
  MapPin,
  Calendar,
  Clock,
  Plus,
  User,
  Bot
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  activities?: any[];
  suggestions?: string[];
}

interface AITripChatProps {
  tripId: string;
  tripDetails?: any;
  onAddActivity?: (activity: any) => void;
  onUpdateItinerary?: (activities: any[]) => void;
}

export default function AITripChat({ tripId, tripDetails, onAddActivity, onUpdateItinerary }: AITripChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI travel assistant. I can help you:

• Add activities to your trip
• Optimize your schedule
• Find restaurants and attractions
• Answer questions about your destination

What would you like to do?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the AI assistant endpoint
      const response = await fetch('/api/ai/trip-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          trip_id: tripId,
          question: input,
          trip_context: tripDetails,
          conversation_history: messages.slice(-5), // Last 5 messages for context
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || data.message,
        timestamp: new Date(),
        activities: data.activities,
        suggestions: data.suggestions,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If activities were parsed, offer to add them
      if (data.activities && data.activities.length > 0) {
        handleParsedActivities(data.activities);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble processing that request. Could you try rephrasing it?",
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParsedActivities = (activities: any[]) => {
    // Show a special message with parsed activities
    const confirmMessage: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: `I found ${activities.length} activities in your itinerary. Would you like me to add them to your trip?`,
      timestamp: new Date(),
      activities,
    };

    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleAddParsedActivities = async (activities: any[]) => {
    if (onUpdateItinerary) {
      onUpdateItinerary(activities);

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Great! I've added ${activities.length} activities to your trip. You can see them in your itinerary.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, successMessage]);

      toast({
        title: 'Activities added!',
        description: `${activities.length} activities have been added to your trip.`,
      });
    }
  };

  const quickActions = [
    "Find restaurants near my hotel",
    "What's the weather tomorrow?",
    "Optimize my schedule",
    "Add a museum visit at 2pm",
    "Find activities for kids",
  ];

  const handleQuickAction = (action: string) => {
    setInput(action);
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">AI Travel Assistant</h3>
          <p className="text-sm text-muted-foreground">Ask me anything about your trip</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Show parsed activities */}
                {message.activities && message.activities.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="text-sm text-muted-foreground">Found activities:</div>
                    {message.activities.slice(0, 3).map((activity, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg p-3 border text-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{activity.title}</div>
                            <div className="text-muted-foreground flex items-center gap-2 mt-1">
                              {activity.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.time}
                                </span>
                              )}
                              {activity.locationName && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {activity.locationName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {message.activities.length > 3 && (
                      <div className="text-sm text-muted-foreground">
                        ...and {message.activities.length - 3} more
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleAddParsedActivities(message.activities!)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add all to trip
                    </Button>
                  </div>
                )}

                {/* Show suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickAction(suggestion)}
                        className="text-xs"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-1">
                  {format(message.timestamp, 'h:mm a')}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto py-2">
          {quickActions.map((action, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction(action)}
              className="text-xs whitespace-nowrap flex-shrink-0"
            >
              {action}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your trip..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}