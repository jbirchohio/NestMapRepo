import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Building2, Users, MapPin, CreditCard, ArrowRight, Sparkles, Target } from 'lucide-react';
interface OnboardingTask {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    completed: boolean;
    action: string;
    actionUrl: string;
    optional?: boolean;
}
interface OnboardingProgressProps {
    onTaskClick: (taskId: string, url: string) => void;
    className?: string;
}
export default function OnboardingProgress({ onTaskClick, className }: OnboardingProgressProps) {
    const tasks: OnboardingTask[] = [
        {
            id: 'company-profile',
            title: 'Complete Company Profile',
            description: 'Add your company details and preferences',
            icon: <Building2 className="h-5 w-5"/>,
            completed: false, // This would be fetched from API
            action: 'Update Profile',
            actionUrl: '/settings/organization'
        },
        {
            id: 'invite-team',
            title: 'Invite Team Members',
            description: 'Add colleagues who will plan and manage travel',
            icon: <Users className="h-5 w-5"/>,
            completed: false,
            action: 'Invite Team',
            actionUrl: '/team/invite'
        },
        {
            id: 'first-trip',
            title: 'Plan Your First Trip',
            description: 'Create a trip to explore NestMap features',
            icon: <MapPin className="h-5 w-5"/>,
            completed: false,
            action: 'Create Trip',
            actionUrl: '/trips/new'
        },
        {
            id: 'setup-billing',
            title: 'Setup Billing & Payments',
            description: 'Configure your subscription and payment methods',
            icon: <CreditCard className="h-5 w-5"/>,
            completed: false,
            action: 'Setup Billing',
            actionUrl: '/billing',
            optional: true
        }
    ];
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const progressPercentage = (completedTasks / totalTasks) * 100;
    const handleTaskClick = (task: OnboardingTask) => {
        onTaskClick(task.id, task.actionUrl);
    };
    return (<Card className={`bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-electric-500"/>
            <CardTitle className="text-lg text-navy-800 dark:text-navy-200">
              Getting Started
            </CardTitle>
          </div>
          <Badge variant="secondary" className="bg-electric-100 text-electric-700">
            {completedTasks}/{totalTasks} Complete
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-navy-600 dark:text-navy-300">Setup Progress</span>
            <span className="font-medium text-electric-600">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2"/>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {tasks.map((task, index) => (<motion.div key={task.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
            <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-navy-50/50 dark:hover:bg-navy-700/50 ${task.completed
                ? 'bg-electric-50/50 dark:bg-electric-900/20 border-electric-200 dark:border-electric-700'
                : 'border-navy-200 dark:border-navy-600'}`}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${task.completed
                ? 'bg-electric-500 text-white'
                : 'bg-navy-100 dark:bg-navy-700 text-navy-500 dark:text-navy-400'}`}>
                {task.completed ? (<CheckCircle className="h-5 w-5"/>) : (task.icon)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium ${task.completed
                ? 'text-electric-700 dark:text-electric-300'
                : 'text-navy-800 dark:text-navy-200'}`}>
                    {task.title}
                  </h4>
                  {task.optional && (<Badge variant="outline" className="text-xs">Optional</Badge>)}
                </div>
                <p className="text-sm text-navy-600 dark:text-navy-300 truncate">
                  {task.description}
                </p>
              </div>

              {!task.completed && (<Button size="sm" variant="outline" onClick={() => handleTaskClick(task)} className="shrink-0 border-electric-300 text-electric-600 hover:bg-electric-50">
                  {task.action}
                  <ArrowRight className="h-3 w-3 ml-1"/>
                </Button>)}
            </div>
          </motion.div>))}

        {completedTasks === totalTasks && (<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-4 p-4 bg-gradient-to-r from-electric-50 to-electric-100 dark:from-electric-900/20 dark:to-electric-800/20 rounded-lg text-center">
            <Target className="h-8 w-8 text-electric-500 mx-auto mb-2"/>
            <h3 className="font-semibold text-electric-700 dark:text-electric-300 mb-1">
              Setup Complete!
            </h3>
            <p className="text-sm text-electric-600 dark:text-electric-400">
              Your organization is ready to start planning amazing trips.
            </p>
          </motion.div>)}
      </CardContent>
    </Card>);
}
