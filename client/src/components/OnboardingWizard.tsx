import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/auth/AuthContext';
import { CheckCircle, Circle, Building2, Users, MapPin, CreditCard, ArrowRight, ArrowLeft, Sparkles, Mail, Calendar, DollarSign, Target, Zap } from 'lucide-react';
interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
    optional?: boolean;
}
interface OnboardingWizardProps {
    onComplete: () => void;
}
export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const { user, userId } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [currentStep, setCurrentStep] = useState(0);
    const [wizardData, setWizardData] = useState({
        company: {
            name: '',
            industry: '',
            size: '',
            description: ''
        },
        teamInvites: [] as {
            email: string;
            role: string;
            name: string;
        }[],
        sampleTrip: {
            title: 'Sample Business Trip to NYC',
            destination: 'New York, NY',
            startDate: '',
            endDate: '',
            budget: 2500,
            description: 'A sample trip to get you started - customize or delete anytime'
        },
        billing: {
            plan: 'team',
            skipForNow: false
        }
    });
    // Calculate next week dates for sample trip
    useEffect(() => {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const weekAfter = new Date(nextWeek);
        weekAfter.setDate(weekAfter.getDate() + 3);
        setWizardData(prev => ({
            ...prev,
            sampleTrip: {
                ...prev.sampleTrip,
                startDate: nextWeek.toISOString().split('T')[0],
                endDate: weekAfter.toISOString().split('T')[0]
            }
        }));
    }, []);
    const steps: OnboardingStep[] = [
        {
            id: 'company',
            title: 'Company Profile',
            description: 'Tell us about your organization',
            icon: <Building2 className="h-5 w-5"/>,
            completed: !!wizardData.company.name && !!wizardData.company.industry
        },
        {
            id: 'team',
            title: 'Invite Team',
            description: 'Add your team members',
            icon: <Users className="h-5 w-5"/>,
            completed: wizardData.teamInvites.length > 0,
            optional: true
        },
        {
            id: 'sample-trip',
            title: 'First Trip',
            description: 'Create a sample trip to explore features',
            icon: <MapPin className="h-5 w-5"/>,
            completed: !!wizardData.sampleTrip.title
        },
        {
            id: 'billing',
            title: 'Billing Setup',
            description: 'Choose your plan and billing details',
            icon: <CreditCard className="h-5 w-5"/>,
            completed: wizardData.billing.skipForNow || wizardData.billing.plan === 'configured',
            optional: true
        }
    ];
    const completedSteps = steps.filter(step => step.completed).length;
    const progressPercentage = (completedSteps / steps.length) * 100;
    // Company setup mutation
    const companyMutation = useMutation({
        mutationFn: async (data: typeof wizardData.company) => {
            // Create or update organization
            return await apiRequest('POST', '/api/organizations', {
                name: data.name,
                industry: data.industry,
                company_size: data.size,
                description: data.description
            });
        },
        onSuccess: () => {
            toast({
                title: "Company profile created",
                description: "Your organization has been set up successfully.",
            });
        }
    });
    // Team invite mutation
    const inviteMutation = useMutation({
        mutationFn: async (invites: typeof wizardData.teamInvites) => {
            const promises = invites.map(invite => apiRequest('POST', '/api/team/invite', {
                email: invite.email,
                role: invite.role,
                name: invite.name
            }));
            return await Promise.all(promises);
        },
        onSuccess: () => {
            toast({
                title: "Team invitations sent",
                description: `${wizardData.teamInvites.length} invitations have been sent.`,
            });
        }
    });
    // Sample trip creation mutation
    const tripMutation = useMutation({
        mutationFn: async (tripData: typeof wizardData.sampleTrip) => {
            // Ensure dates are valid, fallback to default dates if needed
            const startDate = tripData.startDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const endDate = tripData.endDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            return await apiRequest('POST', '/api/trips', {
                title: tripData.title,
                city: tripData.destination,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
                description: tripData.description || 'Sample trip created during onboarding',
                budget: tripData.budget ? parseInt(tripData.budget.toString()) : 2500,
                tripType: 'business'
            });
        },
        onSuccess: () => {
            toast({
                title: "Sample trip created",
                description: "Your first trip is ready to explore!",
            });
            queryClient.invalidateQueries({ queryKey: ['/api/trips'] });
        }
    });
    const addTeamMember = () => {
        setWizardData(prev => ({
            ...prev,
            teamInvites: [...prev.teamInvites, { email: '', role: 'member', name: '' }]
        }));
    };
    const updateTeamMember = (index: number, field: string, value: string) => {
        setWizardData(prev => ({
            ...prev,
            teamInvites: prev.teamInvites.map((invite, i) => i === index ? { ...invite, [field]: value } : invite)
        }));
    };
    const removeTeamMember = (index: number) => {
        setWizardData(prev => ({
            ...prev,
            teamInvites: prev.teamInvites.filter((_, i) => i !== index)
        }));
    };
    const handleNext = async () => {
        const currentStepData = steps[currentStep];
        // Execute current step actions
        switch (currentStepData.id) {
            case 'company':
                if (wizardData.company.name && wizardData.company.industry) {
                    await companyMutation.mutateAsync(wizardData.company);
                }
                break;
            case 'team':
                if (wizardData.teamInvites.length > 0) {
                    await inviteMutation.mutateAsync(wizardData.teamInvites);
                }
                break;
            case 'sample-trip':
                if (wizardData.sampleTrip.title) {
                    await tripMutation.mutateAsync(wizardData.sampleTrip);
                }
                break;
            case 'billing':
                // Handle billing setup
                break;
        }
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
        else {
            handleComplete();
        }
    };
    const handleComplete = () => {
        toast({
            title: "Welcome to NestMap!",
            description: "Your organization is ready to start planning amazing trips.",
        });
        onComplete();
    };
    const canProceed = () => {
        const step = steps[currentStep];
        return step.completed || step.optional;
    };
    return (<div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
        <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-6 w-6 text-electric-500"/>
              <CardTitle className="text-2xl bg-gradient-to-r from-electric-600 to-electric-400 bg-clip-text text-transparent">
                Welcome to NestMap
              </CardTitle>
            </div>
            <CardDescription className="text-navy-600 dark:text-navy-300">
              Let's get your organization set up in just a few steps
            </CardDescription>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-navy-600 dark:text-navy-300">
                  Setup Progress
                </span>
                <span className="text-sm font-medium text-electric-600">
                  {completedSteps}/{steps.length} Complete
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2"/>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-4 mt-6">
              {steps.map((step, index) => (<div key={step.id} className="flex flex-col items-center gap-1">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${step.completed
                ? 'bg-electric-500 border-electric-500 text-white'
                : index === currentStep
                    ? 'bg-electric-100 border-electric-500 text-electric-700'
                    : 'bg-navy-100 border-navy-300 text-navy-400'}`}>
                    {step.completed ? (<CheckCircle className="h-5 w-5"/>) : (step.icon)}
                  </div>
                  <span className={`text-xs text-center ${index === currentStep ? 'text-electric-600 font-medium' : 'text-navy-500'}`}>
                    {step.title}
                  </span>
                </div>))}
            </div>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                {/* Step Content */}
                {currentStep === 0 && (<div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-800 dark:text-navy-200 mb-2">
                        Company Information
                      </h3>
                      <p className="text-navy-600 dark:text-navy-300 text-sm mb-4">
                        Help us customize your experience by telling us about your organization.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company-name">Company Name *</Label>
                        <Input id="company-name" value={wizardData.company.name} onChange={(e) => setWizardData(prev => ({
                ...prev,
                company: { ...prev.company, name: e.target.value }
            }))} placeholder="Acme Corporation"/>
                      </div>
                      
                      <div>
                        <Label htmlFor="industry">Industry *</Label>
                        <Select value={wizardData.company.industry} onValueChange={(value) => setWizardData(prev => ({
                ...prev,
                company: { ...prev.company, industry: value }
            }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry"/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="consulting">Consulting</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="company-size">Company Size</Label>
                        <Select value={wizardData.company.size} onValueChange={(value) => setWizardData(prev => ({
                ...prev,
                company: { ...prev.company, size: value }
            }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select size"/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">11-50 employees</SelectItem>
                            <SelectItem value="51-200">51-200 employees</SelectItem>
                            <SelectItem value="201-1000">201-1000 employees</SelectItem>
                            <SelectItem value="1000+">1000+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Company Description</Label>
                      <Textarea id="description" value={wizardData.company.description} onChange={(e) => setWizardData(prev => ({
                ...prev,
                company: { ...prev.company, description: e.target.value }
            }))} placeholder="Brief description of your company and travel needs..." rows={3}/>
                    </div>
                  </div>)}

                {currentStep === 1 && (<div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-800 dark:text-navy-200 mb-2">
                        Invite Your Team
                      </h3>
                      <p className="text-navy-600 dark:text-navy-300 text-sm mb-4">
                        Add team members who will be planning and managing travel. You can always invite more people later.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {wizardData.teamInvites.map((invite, index) => (<Card key={index} className="p-4 bg-navy-50/50 dark:bg-navy-700/50">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <Label htmlFor={`name-${index}`}>Name</Label>
                              <Input id={`name-${index}`} value={invite.name} onChange={(e) => updateTeamMember(index, 'name', e.target.value)} placeholder="John Doe"/>
                            </div>
                            <div>
                              <Label htmlFor={`email-${index}`}>Email</Label>
                              <Input id={`email-${index}`} type="email" value={invite.email} onChange={(e) => updateTeamMember(index, 'email', e.target.value)} placeholder="john@company.com"/>
                            </div>
                            <div>
                              <Label htmlFor={`role-${index}`}>Role</Label>
                              <Select value={invite.role} onValueChange={(value) => updateTeamMember(index, 'role', value)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end">
                              <Button variant="outline" size="sm" onClick={() => removeTeamMember(index)} className="w-full">
                                Remove
                              </Button>
                            </div>
                          </div>
                        </Card>))}

                      <Button variant="outline" onClick={addTeamMember} className="w-full border-dashed border-electric-300 text-electric-600 hover:bg-electric-50">
                        <Users className="h-4 w-4 mr-2"/>
                        Add Team Member
                      </Button>
                    </div>
                  </div>)}

                {currentStep === 2 && (<div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-800 dark:text-navy-200 mb-2">
                        Create Your First Trip
                      </h3>
                      <p className="text-navy-600 dark:text-navy-300 text-sm mb-4">
                        We'll create a sample trip to help you explore NestMap's features. You can customize or delete it anytime.
                      </p>
                    </div>

                    <Card className="p-4 bg-gradient-to-r from-electric-50 to-electric-100 dark:from-electric-900/20 dark:to-electric-800/20">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="trip-title">Trip Title</Label>
                          <Input id="trip-title" value={wizardData.sampleTrip.title} onChange={(e) => setWizardData(prev => ({
                ...prev,
                sampleTrip: { ...prev.sampleTrip, title: e.target.value }
            }))}/>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="destination">Destination</Label>
                            <Input id="destination" value={wizardData.sampleTrip.destination} onChange={(e) => setWizardData(prev => ({
                ...prev,
                sampleTrip: { ...prev.sampleTrip, destination: e.target.value }
            }))}/>
                          </div>
                          <div>
                            <Label htmlFor="budget">Budget ($)</Label>
                            <Input id="budget" type="number" value={wizardData.sampleTrip.budget} onChange={(e) => setWizardData(prev => ({
                ...prev,
                sampleTrip: { ...prev.sampleTrip, budget: Number(e.target.value) }
            }))}/>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="start-date">Start Date</Label>
                            <Input id="start-date" type="date" value={wizardData.sampleTrip.startDate} onChange={(e) => setWizardData(prev => ({
                ...prev,
                sampleTrip: { ...prev.sampleTrip, startDate: e.target.value }
            }))}/>
                          </div>
                          <div>
                            <Label htmlFor="end-date">End Date</Label>
                            <Input id="end-date" type="date" value={wizardData.sampleTrip.endDate} onChange={(e) => setWizardData(prev => ({
                ...prev,
                sampleTrip: { ...prev.sampleTrip, endDate: e.target.value }
            }))}/>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-electric-100/50 dark:bg-electric-900/30 rounded-lg">
                          <Sparkles className="h-4 w-4 text-electric-600"/>
                          <span className="text-sm text-electric-700 dark:text-electric-300">
                            This sample trip will help you explore features like AI recommendations, expense tracking, and team collaboration.
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>)}

                {currentStep === 3 && (<div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-navy-800 dark:text-navy-200 mb-2">
                        Choose Your Plan
                      </h3>
                      <p className="text-navy-600 dark:text-navy-300 text-sm mb-4">
                        Select a plan that fits your organization's needs. You can upgrade or downgrade anytime.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className={`p-4 cursor-pointer transition-all ${wizardData.billing.plan === 'team'
                ? 'ring-2 ring-electric-500 bg-electric-50/50 dark:bg-electric-900/20'
                : 'hover:bg-navy-50/50 dark:hover:bg-navy-700/50'}`} onClick={() => setWizardData(prev => ({ ...prev, billing: { ...prev.billing, plan: 'team' } }))}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-navy-800 dark:text-navy-200">Team Plan</h4>
                          <Badge variant="secondary">Popular</Badge>
                        </div>
                        <div className="text-2xl font-bold text-electric-600 mb-2">$29<span className="text-sm text-navy-500">/month</span></div>
                        <ul className="space-y-2 text-sm text-navy-600 dark:text-navy-300">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Unlimited trips
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Team collaboration
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Analytics dashboard
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Mobile apps
                          </li>
                        </ul>
                      </Card>

                      <Card className={`p-4 cursor-pointer transition-all ${wizardData.billing.plan === 'enterprise'
                ? 'ring-2 ring-electric-500 bg-electric-50/50 dark:bg-electric-900/20'
                : 'hover:bg-navy-50/50 dark:hover:bg-navy-700/50'}`} onClick={() => setWizardData(prev => ({ ...prev, billing: { ...prev.billing, plan: 'enterprise' } }))}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-navy-800 dark:text-navy-200">Enterprise</h4>
                          <Badge className="bg-electric-500">Premium</Badge>
                        </div>
                        <div className="text-2xl font-bold text-electric-600 mb-2">$99<span className="text-sm text-navy-500">/month</span></div>
                        <ul className="space-y-2 text-sm text-navy-600 dark:text-navy-300">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Everything in Team
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Corporate cards
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            Approval workflows
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-electric-500"/>
                            White-label branding
                          </li>
                        </ul>
                      </Card>
                    </div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="skip-billing" checked={wizardData.billing.skipForNow} onChange={(e) => setWizardData(prev => ({
                ...prev,
                billing: { ...prev.billing, skipForNow: e.target.checked }
            }))} className="rounded border-navy-300"/>
                      <Label htmlFor="skip-billing" className="text-sm text-navy-600 dark:text-navy-300">
                        Skip billing setup for now (you can add it later)
                      </Label>
                    </div>
                  </div>)}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <Separator className="my-6"/>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4 mr-2"/>
                Previous
              </Button>

              <Button onClick={handleNext} disabled={!canProceed() || companyMutation.isPending || inviteMutation.isPending || tripMutation.isPending} className="bg-electric-500 hover:bg-electric-600 text-white">
                {currentStep === steps.length - 1 ? (<>
                    Complete Setup
                    <Zap className="h-4 w-4 ml-2"/>
                  </>) : (<>
                    Next Step
                    <ArrowRight className="h-4 w-4 ml-2"/>
                  </>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>);
}
