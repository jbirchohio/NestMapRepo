import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  X, ExternalLink, Check, Clock, Shield, 
  AlertCircle, ChevronLeft, Sparkles, Hotel,
  CreditCard, CheckCircle2, ArrowRight
} from 'lucide-react';

interface HotelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    price: string;
    image: string;
    bookingUrl: string;
  };
  tripId: string;
  checkIn: string;
  checkOut: string;
  onBookingConfirmed: (hotel: any) => void;
}

export default function HotelBookingModal({
  isOpen,
  onClose,
  hotel,
  tripId,
  checkIn,
  checkOut,
  onBookingConfirmed
}: HotelBookingModalProps) {
  const { toast } = useToast();
  const [bookingStep, setBookingStep] = useState<'iframe' | 'external' | 'confirm'>('iframe');
  const [isLoading, setIsLoading] = useState(true);
  const [trackingId, setTrackingId] = useState<string>('');
  const [startTime, setStartTime] = useState<number>(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      const tracking = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setTrackingId(tracking);
      setStartTime(Date.now());
      setBookingStep('iframe');
      setHasInteracted(false);
      
      // Save pending booking
      savePendingBooking(tracking);
      
      // Listen for visibility changes to detect if user switched tabs
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Set up periodic check for booking completion
      const checkInterval = setInterval(() => {
        checkBookingStatus(tracking);
      }, 5000); // Check every 5 seconds
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(checkInterval);
      };
    }
  }, [isOpen, hotel]);

  const savePendingBooking = async (tracking: string) => {
    try {
      await fetch('/api/bookings/pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tripId,
          hotelId: hotel.id,
          hotelName: hotel.name,
          price: hotel.price,
          trackingId: tracking,
          checkIn,
          checkOut,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to save pending booking:', error);
    }
  };

  const checkBookingStatus = async (tracking: string) => {
    try {
      const response = await fetch(`/api/bookings/check-status/${tracking}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.completed) {
          // Auto-confirm if we detect completion
          handleBookingConfirmed(true);
        }
      }
    } catch (error) {
      console.error('Failed to check booking status:', error);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      // User switched tabs - likely went to Expedia
      setHasInteracted(true);
      
      // After they come back, show confirmation after a delay
      setTimeout(() => {
        if (!document.hidden && bookingStep === 'iframe') {
          setBookingStep('confirm');
        }
      }, 3000);
    }
  };

  const handleOpenExternal = () => {
    // Track the external open
    const timeSpent = Date.now() - startTime;
    
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        event: 'hotel_booking_external',
        properties: {
          hotelId: hotel.id,
          trackingId,
          timeSpentInModal: timeSpent
        }
      })
    }).catch(console.error);

    // Open in new tab with tracking
    const trackingUrl = `${hotel.bookingUrl}&tracking=${trackingId}&ref=remvana_modal`;
    window.open(trackingUrl, '_blank');
    
    setBookingStep('external');
    
    // Show confirmation after delay
    setTimeout(() => {
      setBookingStep('confirm');
    }, 5000);
  };

  const handleBookingConfirmed = async (confirmed: boolean) => {
    if (confirmed) {
      try {
        // Add hotel to trip
        const response = await fetch('/api/trips/add-hotel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            tripId,
            hotel: {
              ...hotel,
              checkIn,
              checkOut
            },
            trackingId,
            confirmed: true
          })
        });

        if (response.ok) {
          toast({
            title: "✅ Hotel Added to Trip!",
            description: `${hotel.name} has been added to your itinerary`,
          });
          
          onBookingConfirmed(hotel);
          onClose();
        }
      } catch (error) {
        console.error('Failed to confirm booking:', error);
        toast({
          title: "Error",
          description: "Failed to add hotel to trip. Please try again.",
          variant: "destructive"
        });
      }
    } else {
      // Mark as browsing
      fetch('/api/bookings/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          trackingId,
          status: 'browsing'
        })
      }).catch(console.error);
      
      onClose();
    }
  };

  const getExpediaUrl = () => {
    // Add tracking parameters to Expedia URL
    const url = new URL(hotel.bookingUrl);
    url.searchParams.append('tracking', trackingId);
    url.searchParams.append('ref', 'remvana_iframe');
    url.searchParams.append('modal', 'true');
    return url.toString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hotel className="w-6 h-6 text-purple-600" />
                  <div>
                    <h2 className="text-lg font-semibold">{hotel.name}</h2>
                    <p className="text-sm text-gray-600">
                      {checkIn} to {checkOut} • {hotel.price}/night
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">
                    <Shield className="w-3 h-3 mr-1" />
                    Secure Booking
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content based on step */}
            <div className="flex-1 relative">
              {bookingStep === 'iframe' && (
                <>
                  {/* Iframe Notice Bar */}
                  <div className="absolute top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-3 z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                        <p className="text-sm text-yellow-800">
                          For the best experience, you may need to complete booking on Expedia's site
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenExternal}
                        className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Expedia
                      </Button>
                    </div>
                  </div>

                  {/* Loading Overlay */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-white flex items-center justify-center z-20">
                      <div className="text-center">
                        <div className="animate-spin h-12 w-12 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading Expedia booking...</p>
                      </div>
                    </div>
                  )}

                  {/* Iframe */}
                  <iframe
                    ref={iframeRef}
                    src={getExpediaUrl()}
                    className="w-full h-full pt-12"
                    onLoad={() => setIsLoading(false)}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    title="Expedia Booking"
                  />

                  {/* Note: Some browsers block third-party cookies in iframes */}
                  {/* Show fallback message if iframe doesn't load properly */}
                </>
              )}

              {bookingStep === 'external' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md p-8">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ExternalLink className="w-10 h-10 text-purple-600" />
                    </div>
                    
                    <h3 className="text-2xl font-semibold mb-4">
                      Complete Your Booking on Expedia
                    </h3>
                    
                    <p className="text-gray-600 mb-6">
                      We've opened Expedia in a new tab for you to complete your booking. 
                      Once you're done, come back here to add the hotel to your trip.
                    </p>
                    
                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={() => handleOpenExternal()}
                        variant="outline"
                      >
                        Open Expedia Again
                      </Button>
                      <Button
                        onClick={() => setBookingStep('confirm')}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
                      >
                        I've Completed Booking
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {bookingStep === 'confirm' && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md p-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <CheckCircle2 className="w-12 h-12 text-purple-600" />
                    </motion.div>
                    
                    <h3 className="text-2xl font-semibold mb-4">
                      Did you book {hotel.name}?
                    </h3>
                    
                    <Card className="mb-6 text-left">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img 
                            src={hotel.image} 
                            alt={hotel.name}
                            className="w-24 h-24 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <p className="font-semibold">{hotel.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {checkIn} - {checkOut}
                            </p>
                            <p className="text-lg font-bold text-purple-600 mt-2">
                              {hotel.price}/night
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <p className="text-gray-600 mb-6">
                      Let us know so we can add this hotel to your trip itinerary 
                      and track your travel plans
                    </p>
                    
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleBookingConfirmed(true)}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0"
                        size="lg"
                      >
                        <Check className="w-5 h-5 mr-2" />
                        Yes, I Booked It!
                      </Button>
                      <Button
                        onClick={() => handleBookingConfirmed(false)}
                        variant="outline"
                        className="flex-1"
                        size="lg"
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        Still Browsing
                      </Button>
                    </div>
                    
                    <button
                      onClick={() => setBookingStep('iframe')}
                      className="mt-4 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1 mx-auto"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Go back to booking
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Progress Indicator */}
            {bookingStep === 'iframe' && (
              <div className="p-3 border-t bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Secure payment processed by Expedia</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setBookingStep('confirm')}
                  >
                    I've completed booking
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}