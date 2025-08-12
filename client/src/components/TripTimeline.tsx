import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, differenceInDays } from 'date-fns';
import {
  Calendar, Clock, MapPin, Plane, Hotel,
  Activity, Utensils, Car, Camera, Coffee,
  Sun, Moon, Sunrise, ChevronRight, Filter,
  Check, Circle, AlertCircle, DollarSign
} from 'lucide-react';

interface TripTimelineProps {
  trip: any;
  activities: any[];
  bookings?: any[];
  onActivityClick?: (activity: any) => void;
}

interface TimelineItem {
  id: string;
  type: 'flight' | 'hotel' | 'activity' | 'meal' | 'transport';
  title: string;
  description?: string;
  date: Date;
  time: string;
  location?: string;
  price?: number;
  status?: 'confirmed' | 'pending' | 'completed';
  icon: any;
  color: string;
  duration?: string;
  booking?: {
    reference?: string;
    provider?: string;
    url?: string;
  };
}

const getTimeOfDayIcon = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 5 && hour < 12) return Sunrise;
  if (hour >= 12 && hour < 17) return Sun;
  if (hour >= 17 && hour < 21) return Moon;
  return Moon;
};

const getActivityIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'flight': return Plane;
    case 'hotel':
    case 'accommodation': return Hotel;
    case 'food':
    case 'meal':
    case 'restaurant': return Utensils;
    case 'transport':
    case 'transfer': return Car;
    case 'tour':
    case 'sightseeing': return Camera;
    default: return Activity;
  }
};

const getActivityColor = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'flight': return 'blue';
    case 'hotel':
    case 'accommodation': return 'purple';
    case 'food':
    case 'meal':
    case 'restaurant': return 'orange';
    case 'transport':
    case 'transfer': return 'green';
    case 'tour':
    case 'sightseeing': return 'pink';
    default: return 'gray';
  }
};

export default function TripTimeline({
  trip,
  activities = [],
  bookings = [],
  onActivityClick
}: TripTimelineProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'daily' | 'list'>('timeline');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // Parse and combine all timeline items
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add activities
    activities.forEach(activity => {
      items.push({
        id: activity.id,
        type: activity.type || 'activity',
        title: activity.title,
        description: activity.description || activity.notes,
        date: new Date(activity.date),
        time: activity.time || '09:00',
        location: activity.location || activity.address,
        price: activity.price,
        status: activity.completed ? 'completed' : activity.booked ? 'confirmed' : 'pending',
        icon: getActivityIcon(activity.type),
        color: getActivityColor(activity.type),
        duration: activity.duration,
        booking: {
          reference: activity.bookingReference,
          provider: activity.provider,
          url: activity.bookingUrl
        }
      });
    });

    // Add hotel check-in/check-out if trip has hotel info
    if (trip.hotel) {
      // Check-in
      items.push({
        id: 'hotel-checkin',
        type: 'hotel',
        title: `Check-in: ${trip.hotel}`,
        description: 'Hotel check-in',
        date: new Date(trip.startDate),
        time: '15:00',
        location: trip.hotelAddress,
        icon: Hotel,
        color: 'purple',
        status: 'confirmed'
      });

      // Check-out
      items.push({
        id: 'hotel-checkout',
        type: 'hotel',
        title: `Check-out: ${trip.hotel}`,
        description: 'Hotel check-out',
        date: new Date(trip.endDate),
        time: '11:00',
        location: trip.hotelAddress,
        icon: Hotel,
        color: 'purple',
        status: 'confirmed'
      });
    }

    // Sort by date and time
    items.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    // Filter by type if needed
    if (filterType !== 'all') {
      return items.filter(item => item.type === filterType);
    }

    return items;
  }, [activities, trip, filterType]);

  // Group items by day
  const itemsByDay = useMemo(() => {
    const grouped = new Map<string, TimelineItem[]>();

    timelineItems.forEach(item => {
      const dateKey = format(item.date, 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)?.push(item);
    });

    return grouped;
  }, [timelineItems]);

  // Calculate trip days
  const tripDays = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return [];

    const days = [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const totalDays = differenceInDays(end, start) + 1;

    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    return days;
  }, [trip]);

  const renderTimelineView = () => (
    <div className="space-y-6">
      {tripDays.map((day, dayIndex) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayItems = itemsByDay.get(dateKey) || [];

        return (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.1 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                Day {dayIndex + 1}
              </Badge>
              <h3 className="text-lg font-semibold">
                {format(day, 'EEEE, MMMM d, yyyy')}
              </h3>
              <span className="text-sm text-gray-500">
                {dayItems.length} activities
              </span>
            </div>

            {dayItems.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No activities planned for this day</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onActivityClick && onActivityClick({ date: day })}
                >
                  Add Activity
                </Button>
              </Card>
            ) : (
              <div className="relative ml-8">
                {/* Timeline line */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />

                {dayItems.map((item, index) => {
                  const Icon = item.icon;
                  const TimeIcon = getTimeOfDayIcon(item.time);

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex gap-4 mb-6"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-3 w-6 h-6 rounded-full border-4 border-white z-10
                        ${item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'confirmed' ? `bg-${item.color}-500` :
                          'bg-gray-300'}`}>
                        {item.status === 'completed' && (
                          <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                        )}
                      </div>

                      {/* Activity card */}
                      <Card
                        className={`flex-1 ml-6 hover:shadow-lg transition-all cursor-pointer
                          ${item.status === 'completed' ? 'opacity-75' : ''}`}
                        onClick={() => onActivityClick && onActivityClick(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className={`w-5 h-5 text-${item.color}-500`} />
                                <h4 className="font-semibold">{item.title}</h4>
                                {item.status === 'confirmed' && (
                                  <Badge variant="secondary" className="text-xs">
                                    Confirmed
                                  </Badge>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              )}

                              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {item.time}
                                  {item.duration && ` (${item.duration})`}
                                </div>
                                {item.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {item.location}
                                  </div>
                                )}
                                {item.price && (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    ${item.price}
                                  </div>
                                )}
                              </div>

                              {item.booking?.reference && (
                                <div className="mt-2 text-xs text-gray-400">
                                  Booking: {item.booking.reference}
                                </div>
                              )}
                            </div>

                            <TimeIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );

  const renderDailyView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tripDays.map((day, dayIndex) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const dayItems = itemsByDay.get(dateKey) || [];

        return (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: dayIndex * 0.05 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Day {dayIndex + 1}</span>
                  <Badge variant="secondary">{dayItems.length}</Badge>
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {format(day, 'EEE, MMM d')}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    No activities
                  </p>
                ) : (
                  dayItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => onActivityClick && onActivityClick(item)}
                      >
                        <Icon className={`w-4 h-4 text-${item.color}-500`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.time}</p>
                        </div>
                        {item.status === 'completed' && (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {timelineItems.map((item, index) => {
        const Icon = item.icon;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card
              className="hover:shadow-md transition-all cursor-pointer"
              onClick={() => onActivityClick && onActivityClick(item)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-${item.color}-100`}>
                    <Icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.title}</h4>
                      {item.status === 'confirmed' && (
                        <Badge variant="secondary" className="text-xs">Confirmed</Badge>
                      )}
                      {item.status === 'completed' && (
                        <Badge variant="secondary" className="text-xs bg-green-100">
                          <Check className="w-3 h-3 mr-1" />
                          Done
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-gray-500">
                      <span>{format(item.date, 'MMM d')}</span>
                      <span>{item.time}</span>
                      {item.location && <span>{item.location}</span>}
                      {item.price && <span>${item.price}</span>}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span>Trip Timeline</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {timelineItems.length} items
              </Badge>
              <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                {tripDays.length} days
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="daily">Daily Grid</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Filter */}
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'activity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('activity')}
            >
              <Activity className="w-4 h-4 mr-1" />
              Activities
            </Button>
            <Button
              variant={filterType === 'hotel' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('hotel')}
            >
              <Hotel className="w-4 h-4 mr-1" />
              Hotels
            </Button>
            <Button
              variant={filterType === 'flight' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('flight')}
            >
              <Plane className="w-4 h-4 mr-1" />
              Flights
            </Button>
          </div>
        </div>

        <TabsContent value="timeline">
          {renderTimelineView()}
        </TabsContent>

        <TabsContent value="daily">
          {renderDailyView()}
        </TabsContent>

        <TabsContent value="list">
          {renderListView()}
        </TabsContent>
      </Tabs>
    </div>
  );
}