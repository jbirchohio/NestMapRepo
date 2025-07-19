import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MapPin, 
  Briefcase, 
  Settings, 
  BarChart3, 
  Plane,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { UserRole, useOnboarding } from '@/contexts/OnboardingContext';

interface RoleOption {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  badge?: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: 'admin',
    title: 'Administrator',
    description: 'Set up and manage your organization\'s travel program',
    icon: <Settings className="h-8 w-8" />,
    badge: 'Full Access',
    features: [
      'Configure travel policies',
      'Manage team members',
      'Set up integrations',
      'View all analytics',
      'Approval workflows'
    ]
  },
  {
    role: 'travel_manager',
    title: 'Travel Manager',
    description: 'Oversee travel requests and optimize travel spend',
    icon: <BarChart3 className="h-8 w-8" />,
    badge: 'Management',
    features: [
      'Approve travel requests',
      'Generate reports',
      'Monitor spend',
      'Optimize routes',
      'Team insights'
    ]
  },
  {
    role: 'traveler',
    title: 'Employee/Traveler',
    description: 'Book and manage your business travel',
    icon: <Plane className="h-8 w-8" />,
    badge: 'Traveler',
    features: [
      'Book flights & hotels',
      'Manage itineraries',
      'Track expenses',
      'Voice assistance',
      'Mobile access'
    ]
  }
];

interface RoleSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onRoleSelected: (role: UserRole) => void;
}

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  open,
  onClose,
  onRoleSelected
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent } = useOnboarding();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    trackEvent('onboarding_role_selected', { role });
  };

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      // Simulate API call to save role preference
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onRoleSelected(selectedRole);
      trackEvent('onboarding_role_confirmed', { role: selectedRole });
    } catch (error) {
      console.error('Failed to save role:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-2xl font-bold">
            Welcome to NestMap! 🎯
          </DialogTitle>
          <p className="text-muted-foreground text-lg mt-2">
            Let's personalize your experience. What best describes your role?
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          {ROLE_OPTIONS.map((option) => (
            <Card
              key={option.role}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedRole === option.role
                  ? 'ring-2 ring-primary border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleRoleSelect(option.role)}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center items-center mb-3">
                  <div className={`p-3 rounded-full ${
                    selectedRole === option.role 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    {option.icon}
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  {option.badge && (
                    <Badge variant={selectedRole === option.role ? 'default' : 'secondary'}>
                      {option.badge}
                    </Badge>
                  )}
                </div>
                
                <CardDescription className="text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">
                    Key Features:
                  </h4>
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className={`h-4 w-4 ${
                        selectedRole === option.role 
                          ? 'text-primary' 
                          : 'text-muted-foreground'
                      }`} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Skip for now
          </Button>

          <Button
            onClick={handleContinue}
            disabled={!selectedRole || isLoading}
            className="min-w-32"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Setting up...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                Continue
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>
        </div>

        <div className="text-center pt-4 text-sm text-muted-foreground">
          Don't worry, you can change this later in your profile settings.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSelectionModal;
