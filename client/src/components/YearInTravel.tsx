import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Share2, 
  Download, 
  Plane, 
  MapPin, 
  Calendar,
  TrendingUp,
  Award,
  Sparkles,
  Globe,
  Coffee
} from 'lucide-react';
import html2canvas from 'html2canvas';

interface YearInTravelProps {
  year?: number;
  onClose?: () => void;
}

interface RecapSlide {
  type: 'intro' | 'stat' | 'list' | 'highlight' | 'personality' | 'fun-fact' | 'outro';
  title: string;
  subtitle?: string;
  value?: any;
  unit?: string;
  description?: string;
  items?: string[];
  facts?: string[];
  cta?: string;
}

export default function YearInTravel({ year = new Date().getFullYear(), onClose }: YearInTravelProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Fetch travel recap
  const { data: recap, isLoading } = useQuery({
    queryKey: ['travel-recap', year],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/travel-analytics/recap/${year}`);
      return response;
    }
  });

  useEffect(() => {
    // Add keyboard navigation
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigatePrev();
      if (e.key === 'ArrowRight') navigateNext();
      if (e.key === 'Escape' && onClose) onClose();
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, recap]);

  const navigateNext = () => {
    if (recap?.slides && currentSlide < recap.slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const navigatePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const shareRecap = async () => {
    const element = document.getElementById('recap-slide');
    if (element) {
      const canvas = await html2canvas(element);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `travel-wrapped-${year}.png`, { type: 'image/png' });
          if (navigator.share) {
            navigator.share({
              title: `My ${year} Travel Wrapped`,
              text: `Check out my ${year} travel adventures!`,
              files: [file]
            });
          } else {
            // Fallback to download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `travel-wrapped-${year}.png`;
            a.click();
          }
        }
      });
    }
  };

  const getSlideBackground = (slide: RecapSlide) => {
    const backgrounds = [
      'bg-gradient-to-br from-purple-600 to-pink-600',
      'bg-gradient-to-br from-blue-600 to-cyan-600',
      'bg-gradient-to-br from-green-600 to-teal-600',
      'bg-gradient-to-br from-orange-600 to-red-600',
      'bg-gradient-to-br from-indigo-600 to-purple-600',
      'bg-gradient-to-br from-pink-600 to-rose-600',
      'bg-gradient-to-br from-yellow-600 to-orange-600',
      'bg-gradient-to-br from-cyan-600 to-blue-600',
      'bg-gradient-to-br from-teal-600 to-green-600',
    ];
    
    return backgrounds[currentSlide % backgrounds.length];
  };

  const renderSlide = (slide: RecapSlide) => {
    const bgClass = getSlideBackground(slide);
    
    switch (slide.type) {
      case 'intro':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="text-center"
            >
              <Plane className="w-20 h-20 mx-auto mb-6" />
              <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
              <p className="text-xl opacity-90">{slide.subtitle}</p>
            </motion.div>
          </div>
        );
      
      case 'stat':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <h2 className="text-3xl font-semibold mb-8">{slide.title}</h2>
              <div className="relative">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="text-8xl font-bold mb-2"
                >
                  {slide.value}
                </motion.div>
                <div className="text-2xl opacity-90 mb-4">{slide.unit}</div>
              </div>
              <p className="text-lg opacity-80">{slide.description}</p>
            </motion.div>
          </div>
        );
      
      case 'list':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <h2 className="text-3xl font-semibold mb-8">{slide.title}</h2>
            <div className="space-y-3 max-w-md w-full">
              {slide.items?.length ? (
                slide.items.map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/20 backdrop-blur rounded-lg p-3 text-lg flex items-center gap-3"
                  >
                    <MapPin className="w-5 h-5" />
                    {item}
                  </motion.div>
                ))
              ) : (
                <p className="text-center opacity-80">No top destinations this year</p>
              )}
            </div>
          </div>
        );
      
      case 'highlight':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Award className="w-16 h-16 mx-auto mb-6" />
              <h2 className="text-3xl font-semibold mb-6">{slide.title}</h2>
              <div className="text-5xl font-bold mb-4">{slide.value}</div>
              <p className="text-lg opacity-80">{slide.description}</p>
            </motion.div>
          </div>
        );
      
      case 'personality':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <motion.div
              initial={{ rotate: -10, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring" }}
              className="text-center"
            >
              <Sparkles className="w-16 h-16 mx-auto mb-6" />
              <h2 className="text-3xl font-semibold mb-6">{slide.title}</h2>
              <div className="bg-white/20 backdrop-blur rounded-2xl p-6 mb-4">
                <div className="text-4xl font-bold mb-2">{slide.value}</div>
              </div>
              <p className="text-lg opacity-90">{slide.description}</p>
            </motion.div>
          </div>
        );
      
      case 'fun-fact':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <h2 className="text-3xl font-semibold mb-8">{slide.title}</h2>
            <div className="space-y-4 max-w-md">
              {slide.facts?.map((fact, index) => (
                <motion.div
                  key={index}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: index * 0.2 }}
                  className="bg-white/20 backdrop-blur rounded-lg p-4 text-lg"
                >
                  {fact}
                </motion.div>
              ))}
            </div>
          </div>
        );
      
      case 'outro':
        return (
          <div className={`h-full flex flex-col items-center justify-center text-white p-8 ${bgClass}`}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <Globe className="w-20 h-20 mx-auto mb-6" />
              <h1 className="text-5xl font-bold mb-4">{slide.title}</h1>
              <p className="text-xl opacity-90 mb-8">{slide.subtitle}</p>
              {slide.cta && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-gray-900 hover:bg-gray-100"
                >
                  {slide.cta}
                </Button>
              )}
            </motion.div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600">
        <div className="text-white text-center">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl">Creating your travel story...</p>
        </div>
      </div>
    );
  }

  if (!recap?.hasData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-600">
        <div className="text-white text-center p-8">
          <Globe className="w-20 h-20 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4">No Trips in {year}</h1>
          <p className="text-xl opacity-90 mb-8">Start planning your next adventure!</p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-gray-900 hover:bg-gray-100"
            onClick={onClose}
          >
            Plan a Trip
          </Button>
        </div>
      </div>
    );
  }

  const slides = recap.slides || [];
  const currentSlideData = slides[currentSlide];

  return (
    <div className={`fixed inset-0 z-50 ${isFullscreen ? '' : 'p-4'}`}>
      <div className="h-full bg-black rounded-lg overflow-hidden relative">
        {/* Slide Content */}
        <div id="recap-slide" className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentSlideData && renderSlide(currentSlideData)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="absolute bottom-8 left-0 right-0 flex items-center justify-between px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={navigatePrev}
            disabled={currentSlide === 0}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          {/* Progress dots */}
          <div className="flex gap-2">
            {slides.map((_: any, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide ? 'bg-white w-8' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={navigateNext}
            disabled={currentSlide === slides.length - 1}
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Top controls */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={shareRecap}
            className="text-white hover:bg-white/20"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}