import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  MessageSquare, 
  Plane,
  MapPin,
  Cloud,
  Calendar,
  User,
  Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VoiceCommand {
  id: string;
  text: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  timestamp: Date;
}

interface VoiceResponse {
  id: string;
  text: string;
  followUp?: string;
  data?: any;
}

interface VoiceSession {
  id: string;
  userId: number;
  isActive: boolean;
  history: VoiceCommand[];
  lastActivity: Date;
}

export default function VoiceInterface() {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'assistant';
    text: string;
    timestamp: Date;
    data?: any;
  }>>([]);
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedTab, setSelectedTab] = useState('voice');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript) {
          processVoiceCommand(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not process voice input. Please try again.",
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Voice command processing mutation
  const processCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest('POST', '/api/voice-interface/process', {
        command,
        sessionId: session?.id
      });
      return response.data;
    },
    onSuccess: (data: VoiceResponse) => {
      setConversation(prev => [...prev, {
        type: 'assistant',
        text: data.text,
        timestamp: new Date(),
        data: data.data
      }]);

      // Speak the response if voice is enabled
      if (voiceEnabled && synthRef.current) {
        speakText(data.text);
      }

      setIsProcessing(false);
    },
    onError: (error) => {
      console.error('Voice command error:', error);
      setIsProcessing(false);
      toast({
        title: "Command Processing Error",
        description: "Could not process your voice command. Please try again.",
        variant: "destructive"
      });
    }
  });

  const processVoiceCommand = async (command: string) => {
    setIsProcessing(true);
    setConversation(prev => [...prev, {
      type: 'user',
      text: command,
      timestamp: new Date()
    }]);

    processCommandMutation.mutate(command);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current && voiceEnabled) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setConversation([]);
    setTranscript('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            NestMap Voice Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="voice">Voice Control</TabsTrigger>
              <TabsTrigger value="conversation">Conversation</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="voice" className="space-y-4">
              <div className="flex items-center justify-center space-x-4">
                <Button
                  size="lg"
                  variant={isListening ? "destructive" : "default"}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className="h-16 w-16 rounded-full"
                >
                  {isListening ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  size="lg"
                  variant={isSpeaking ? "destructive" : "outline"}
                  onClick={isSpeaking ? stopSpeaking : () => {}}
                  disabled={!isSpeaking}
                  className="h-16 w-16 rounded-full"
                >
                  {isSpeaking ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {isListening ? "Listening..." : 
                   isProcessing ? "Processing..." :
                   isSpeaking ? "Speaking..." :
                   "Click the microphone to start"}
                </p>
                
                {transcript && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{transcript}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processVoiceCommand("What's the weather like?")}
                  disabled={isProcessing}
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Weather
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processVoiceCommand("Check my flight status")}
                  disabled={isProcessing}
                >
                  <Plane className="h-4 w-4 mr-2" />
                  Flights
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processVoiceCommand("Show my trip information")}
                  disabled={isProcessing}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Trips
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => processVoiceCommand("Recommend restaurants")}
                  disabled={isProcessing}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Places
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="conversation" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Conversation History</h3>
                <Button variant="outline" size="sm" onClick={clearConversation}>
                  Clear History
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {conversation.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversation yet. Start by saying something!</p>
                  </div>
                ) : (
                  conversation.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Voice Responses</h4>
                    <p className="text-sm text-muted-foreground">
                      Enable audio responses from the assistant
                    </p>
                  </div>
                  <Button
                    variant={voiceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                  >
                    {voiceEnabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Voice Commands</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>• "What's the weather like in [city]?"</p>
                    <p>• "Check my flight status for [flight number]"</p>
                    <p>• "Show my trip information"</p>
                    <p>• "Recommend restaurants in [location]"</p>
                    <p>• "Book a flight to [destination]"</p>
                    <p>• "What's my next meeting?"</p>
                  </div>
                </div>

                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Voice recognition requires microphone permissions. 
                    Make sure your browser allows microphone access for the best experience.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
