import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, differenceInHours, isPast, addDays } from 'date-fns';
import { 
  Bell, Clock, Calendar, AlertTriangle,
  Check, X, ChevronRight, Plane, Hotel,
  Car, Activity, CreditCard, Mail,
  Phone, MessageSquare, ExternalLink,
  Timer, TrendingUp, Shield
} from 'lucide-react';

interface BookingRemindersProps {
  tripId: string;
  tripStartDate: Date;
  activities?: any[];
  bookings?: any[];
  onReminderAction?: (reminder: any, action: string) => void;
}

interface Reminder {
  id: string;
  type: 'booking' | 'payment' | 'document' | 'preparation';
  category: 'flight' | 'hotel' | 'activity' | 'transport' | 'general';
  title: string;
  description: string;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'dismissed';
  actionRequired: boolean;
  actionUrl?: string;
  relatedBooking?: any;
  icon: any;
  color: string;
}

export default function BookingReminders({
  tripId,
  tripStartDate,
  activities = [],
  bookings = [],
  onReminderAction
}: BookingRemindersProps) {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'pending' | 'completed'>('all');
  const [showNotifications, setShowNotifications] = useState(true);

  useEffect(() => {
    generateReminders();
    checkForUrgentReminders();
  }, [activities, bookings, tripStartDate]);

  const generateReminders = () => {
    const newReminders: Reminder[] = [];
    const now = new Date();
    const tripStart = new Date(tripStartDate);
    const daysUntilTrip = differenceInDays(tripStart, now);

    // Flight reminders
    const flightActivities = activities.filter(a => a.type === 'flight' && !a.booked);
    if (flightActivities.length === 0 && daysUntilTrip < 60) {
      newReminders.push({
        id: 'flight-booking',
        type: 'booking',
        category: 'flight',
        title: 'Book Your Flights',
        description: `Flights should be booked soon for better prices. ${daysUntilTrip} days until trip.`,
        dueDate: daysUntilTrip > 30 ? addDays(now, 7) : addDays(now, 2),
        priority: daysUntilTrip < 30 ? 'high' : 'medium',
        status: 'pending',
        actionRequired: true,
        actionUrl: '/flights',
        icon: Plane,
        color: 'blue'
      });
    }

    // Hotel reminders
    const hotelBooked = activities.some(a => a.type === 'hotel' && a.booked);
    if (!hotelBooked && daysUntilTrip < 45) {
      newReminders.push({
        id: 'hotel-booking',
        type: 'booking',
        category: 'hotel',
        title: 'Reserve Your Accommodation',
        description: 'Popular hotels fill up quickly. Book now for best selection.',
        dueDate: addDays(now, 5),
        priority: daysUntilTrip < 20 ? 'high' : 'medium',
        status: 'pending',
        actionRequired: true,
        icon: Hotel,
        color: 'purple'
      });
    }

    // Activity booking reminders
    const unbookedActivities = activities.filter(a => 
      !a.booked && a.type !== 'flight' && a.type !== 'hotel' && a.bookingUrl
    );
    
    unbookedActivities.forEach(activity => {
      const activityDate = new Date(activity.date);
      const daysUntilActivity = differenceInDays(activityDate, now);
      
      if (daysUntilActivity < 14 && daysUntilActivity > 0) {
        newReminders.push({
          id: `activity-${activity.id}`,
          type: 'booking',
          category: 'activity',
          title: `Book: ${activity.title}`,
          description: `This activity needs advance booking. ${daysUntilActivity} days until activity.`,
          dueDate: addDays(now, Math.min(3, daysUntilActivity - 1)),
          priority: daysUntilActivity < 7 ? 'high' : 'medium',
          status: 'pending',
          actionRequired: true,
          actionUrl: activity.bookingUrl,
          relatedBooking: activity,
          icon: Activity,
          color: 'green'
        });
      }
    });

    // Check-in reminders for flights
    const flightBookings = bookings.filter(b => b.type === 'flight' && b.status === 'confirmed');
    flightBookings.forEach(booking => {
      const flightDate = new Date(booking.departureDate);
      const hoursUntilFlight = differenceInHours(flightDate, now);
      
      if (hoursUntilFlight < 48 && hoursUntilFlight > 0) {
        newReminders.push({
          id: `checkin-${booking.id}`,
          type: 'preparation',
          category: 'flight',
          title: 'Online Check-in Available',
          description: `Check in for your ${booking.airline} flight to ${booking.destination}`,
          dueDate: addDays(flightDate, -1),
          priority: 'high',
          status: 'pending',
          actionRequired: true,
          actionUrl: booking.checkInUrl,
          relatedBooking: booking,
          icon: Plane,
          color: 'blue'
        });
      }
    });

    // Travel insurance reminder
    if (daysUntilTrip < 30 && daysUntilTrip > 7) {
      newReminders.push({
        id: 'insurance',
        type: 'document',
        category: 'general',
        title: 'Consider Travel Insurance',
        description: 'Protect your trip with travel insurance coverage',
        dueDate: addDays(tripStart, -7),
        priority: 'low',
        status: 'pending',
        actionRequired: false,
        icon: Shield,
        color: 'teal'
      });
    }

    // Passport/visa reminder for international trips
    if (daysUntilTrip < 60 && daysUntilTrip > 14) {
      newReminders.push({
        id: 'documents',
        type: 'document',
        category: 'general',
        title: 'Check Travel Documents',
        description: 'Ensure passport is valid and check visa requirements',
        dueDate: addDays(tripStart, -14),
        priority: 'medium',
        status: 'pending',
        actionRequired: true,
        icon: CreditCard,
        color: 'orange'
      });
    }

    // Payment reminders for pending bookings
    const pendingPayments = bookings.filter(b => b.status === 'pending' && b.paymentDue);
    pendingPayments.forEach(booking => {
      const paymentDue = new Date(booking.paymentDue);
      const daysUntilPayment = differenceInDays(paymentDue, now);
      
      if (daysUntilPayment < 7 && daysUntilPayment > 0) {
        newReminders.push({
          id: `payment-${booking.id}`,
          type: 'payment',
          category: booking.type,
          title: `Payment Due: ${booking.name}`,
          description: `Complete payment to confirm your booking. Due in ${daysUntilPayment} days.`,
          dueDate: paymentDue,
          priority: 'high',
          status: 'pending',
          actionRequired: true,
          actionUrl: booking.paymentUrl,
          relatedBooking: booking,
          icon: CreditCard,
          color: 'red'
        });
      }
    });

    setReminders(newReminders);
  };

  const checkForUrgentReminders = () => {
    const urgentReminders = reminders.filter(r => 
      r.priority === 'high' && 
      r.status === 'pending' &&
      differenceInDays(r.dueDate, new Date()) < 3
    );

    if (urgentReminders.length > 0 && showNotifications) {
      toast({
        title: "⏰ Urgent Reminders",
        description: `You have ${urgentReminders.length} urgent items that need attention`,
      });
    }
  };

  const handleReminderAction = (reminder: Reminder, action: 'complete' | 'dismiss' | 'snooze') => {
    if (action === 'complete') {
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, status: 'completed' } : r
      ));
      toast({
        title: "✅ Marked as Complete",
        description: reminder.title,
      });
    } else if (action === 'dismiss') {
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, status: 'dismissed' } : r
      ));
    } else if (action === 'snooze') {
      setReminders(prev => prev.map(r => 
        r.id === reminder.id ? { ...r, dueDate: addDays(r.dueDate, 1) } : r
      ));
      toast({
        title: "Snoozed for 24 hours",
        description: reminder.title,
      });
    }

    if (onReminderAction) {
      onReminderAction(reminder, action);
    }
  };

  const getFilteredReminders = () => {
    switch (filter) {
      case 'urgent':
        return reminders.filter(r => r.priority === 'high' && r.status === 'pending');
      case 'pending':
        return reminders.filter(r => r.status === 'pending');
      case 'completed':
        return reminders.filter(r => r.status === 'completed');
      default:
        return reminders;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const days = differenceInDays(dueDate, new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  const filteredReminders = getFilteredReminders();
  const completionRate = reminders.length > 0 
    ? Math.round((reminders.filter(r => r.status === 'completed').length / reminders.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              <span>Booking Reminders</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {reminders.filter(r => r.status === 'pending').length} pending
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                {showNotifications ? <Bell className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completion Progress</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({reminders.length})
              </Button>
              <Button
                variant={filter === 'urgent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('urgent')}
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                Urgent
              </Button>
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Button>
              <Button
                variant={filter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('completed')}
              >
                <Check className="w-3 h-3 mr-1" />
                Done
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Alert */}
      {filteredReminders.filter(r => r.priority === 'high' && r.status === 'pending').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription>
            <strong>Action Required:</strong> You have urgent items that need immediate attention to avoid missing deadlines.
          </AlertDescription>
        </Alert>
      )}

      {/* Reminders List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredReminders.map((reminder, index) => {
            const Icon = reminder.icon;
            const priorityColor = getPriorityColor(reminder.priority);
            const dueText = getDaysUntilDue(reminder.dueDate);
            const isOverdue = differenceInDays(reminder.dueDate, new Date()) < 0;
            
            return (
              <motion.div
                key={reminder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`
                  ${reminder.status === 'completed' ? 'opacity-60' : ''}
                  ${isOverdue && reminder.status === 'pending' ? 'border-red-300 bg-red-50' : ''}
                  hover:shadow-lg transition-all
                `}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg bg-${reminder.color}-100`}>
                        <Icon className={`w-5 h-5 text-${reminder.color}-600`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              {reminder.title}
                              {reminder.status === 'completed' && (
                                <Badge variant="secondary" className="text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Done
                                </Badge>
                              )}
                              {reminder.priority === 'high' && reminder.status === 'pending' && (
                                <Badge className={`bg-${priorityColor}-100 text-${priorityColor}-700 border-${priorityColor}-300`}>
                                  Urgent
                                </Badge>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dueText}
                            </div>
                            {reminder.actionRequired && (
                              <Badge variant="outline" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            {reminder.actionUrl && reminder.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                                onClick={() => window.open(reminder.actionUrl, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Take Action
                              </Button>
                            )}
                            {reminder.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReminderAction(reminder, 'complete')}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReminderAction(reminder, 'snooze')}
                                >
                                  <Timer className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredReminders.length === 0 && (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No reminders</h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? "You're all caught up! No reminders at this time."
              : `No ${filter} reminders found.`}
          </p>
        </Card>
      )}
    </div>
  );
}