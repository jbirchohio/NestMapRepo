import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VoiceInterface from '@/components/VoiceInterface';
import { Mic, Brain, MessageSquare, Zap } from 'lucide-react';

export default function VoiceAssistant() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Voice Assistant</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Interact with NestMap using natural voice commands. Get instant help with travel planning, 
          flight information, weather updates, and personalized recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="text-center">
            <Mic className="h-8 w-8 mx-auto mb-2 text-primary" />
            <CardTitle className="text-lg">Voice Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Advanced speech-to-text processing with natural language understanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 text-primary" />
            <CardTitle className="text-lg">AI-Powered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Intelligent responses powered by OpenAI GPT-4 with travel expertise
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
            <CardTitle className="text-lg">Real-Time Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Live weather, flight status, and travel information at your command
            </p>
          </CardContent>
        </Card>
      </div>

      <VoiceInterface />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Sample Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Badge variant="outline">Travel Planning</Badge>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• "Plan a trip to Tokyo for next month"</li>
                <li>• "Show me my upcoming trips"</li>
                <li>• "What's the best time to visit Paris?"</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <Badge variant="outline">Flight Information</Badge>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• "Check flight UA123 status"</li>
                <li>• "When is my next flight?"</li>
                <li>• "Find flights to London"</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Badge variant="outline">Weather & Recommendations</Badge>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• "What's the weather in New York?"</li>
                <li>• "Recommend restaurants in Rome"</li>
                <li>• "Best activities in Barcelona"</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Natural Language Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Understands context and intent from natural speech patterns
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Multi-Modal Responses</h4>
                <p className="text-sm text-muted-foreground">
                  Provides both voice and visual responses with rich data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Contextual Memory</h4>
                <p className="text-sm text-muted-foreground">
                  Remembers conversation context for follow-up questions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <h4 className="font-medium">Real-Time Integration</h4>
                <p className="text-sm text-muted-foreground">
                  Connected to live travel APIs and your personal data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
