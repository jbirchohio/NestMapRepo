import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import {
  X, Send, Sparkles, MapPin, Calendar,
  Users, DollarSign, Loader2, Bot, User
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITripChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickPrompts = [
  { icon: MapPin, text: "Beach vacation for a week", color: "text-blue-600" },
  { icon: Calendar, text: "Weekend city break", color: "text-purple-600" },
  { icon: Users, text: "Family trip with kids", color: "text-green-600" },
  { icon: DollarSign, text: "Budget backpacking trip", color: "text-orange-600" },
];

export default function AITripChatModal({ isOpen, onClose }: AITripChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message
      setMessages([{
        id: '1',
        role: 'assistant',
        content: "Hi! I'm your AI travel planner. Tell me about your dream trip - where you want to go, when, and what you'd love to do. I'll help you create the perfect itinerary!",
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createTripFromSuggestion = async (suggestion: any) => {
    try {
      // Create the trip first
      const tripResponse = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: suggestion.title,
          description: suggestion.description,
          city: suggestion.city,
          country: suggestion.country,
          startDate: suggestion.startDate,
          endDate: suggestion.endDate,
          cityLatitude: suggestion.activities?.[0]?.latitude || null,
          cityLongitude: suggestion.activities?.[0]?.longitude || null
        })
      });

      if (!tripResponse.ok) {
        throw new Error('Failed to create trip');
      }

      const newTrip = await tripResponse.json();
      // Now create activities for the trip
      if (suggestion.activities && suggestion.activities.length > 0) {
        for (const activity of suggestion.activities) {
          try {
            const activityResponse = await fetch('/api/activities', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                tripId: newTrip.id,
                title: activity.title,
                date: activity.date,
                time: activity.time || '09:00',
                location: activity.locationName,
                notes: activity.notes || '',
                latitude: activity.latitude,
                longitude: activity.longitude
              })
            });

            if (!activityResponse.ok) {
              }
          } catch (error) {
            }
        }
      }

      // Success! Navigate to the trip
      toast({
        title: "✈️ Trip Created!",
        description: `Your ${suggestion.title} is ready with ${suggestion.activities?.length || 0} activities!`,
      });

      // Navigate to the new trip
      setLocation(`/trip/${newTrip.id}`);
      onClose();

      return newTrip;
    } catch (error) {
      throw error;
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Check if user is confirming trip creation
    const lowerText = text.toLowerCase();
    const isConfirmingCreation = (lowerText.includes('yes') ||
                                  lowerText.includes('create') ||
                                  lowerText.includes('go ahead') ||
                                  lowerText.includes('do it') ||
                                  lowerText.includes('sure')) &&
                                  (window as any).pendingTripSuggestion;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // If user is confirming, create the trip
      if (isConfirmingCreation) {
        const suggestion = (window as any).pendingTripSuggestion;

        const creatingMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Creating your trip to ${suggestion.city}... 🎉`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, creatingMessage]);

        const trip = await createTripFromSuggestion(suggestion);

        // Clear the pending suggestion
        delete (window as any).pendingTripSuggestion;
        
        // Success message
        const successMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `Your trip has been created successfully! Redirecting you to your itinerary... 🚀`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, successMessage]);
        
        // Redirect to the new trip after a short delay
        setTimeout(() => {
          onClose();
          setLocation(`/trip/${trip.id}`);
        }, 1500);
        
        return;
      }

      // Otherwise, continue the conversation
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the AI suggests creating a trip, offer to create it
      if (data.tripSuggestion) {
        // Add a follow-up message asking if they want to create the trip
        const confirmMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `I've prepared a trip plan for "${data.tripSuggestion.title}". Would you like me to create this trip for you? Just say "yes" or "create it" to proceed, or we can keep refining the plan!`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, confirmMessage]);

        // Store the suggestion for later use
        (window as any).pendingTripSuggestion = data.tripSuggestion;
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error && error.message.includes('create trip')
          ? "I couldn't create the trip. Please try again or create it manually from the dashboard."
          : "I'm having trouble connecting right now. Please try again in a moment!",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl w-full max-w-2xl h-[600px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Trip Planner</h2>
                  <p className="text-white/80 text-sm">Tell me about your dream trip</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'assistant'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gray-200'
                }`}>
                  {message.role === 'assistant' ? (
                    <Bot className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gray-100 text-gray-900'
                    : 'bg-gradient-to-r from-purple-50 to-pink-50 text-gray-900'
                } rounded-2xl px-4 py-3`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts - show only at start */}
          {messages.length <= 1 && (
            <div className="px-6 pb-4">
              <p className="text-sm text-gray-600 mb-3">Try these to get started:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left text-sm"
                  >
                    <prompt.icon className={`w-4 h-4 ${prompt.color}`} />
                    <span className="text-gray-700">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-4">
            <form onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your ideal trip..."
                className="flex-1 px-4 py-3 rounded-xl bg-gray-100 outline-none focus:ring-2 focus:ring-purple-600"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}