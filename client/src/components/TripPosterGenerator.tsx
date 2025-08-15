import React, { useRef, useState } from 'react';
import { ClientTrip, ClientActivity } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, Share2, Camera, Palette, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface TripPosterGeneratorProps {
  trip: ClientTrip;
  activities: ClientActivity[];
  onClose?: () => void;
}

const posterThemes = [
  {
    id: 'sunset',
    name: 'Sunset Vibes',
    gradient: 'from-orange-400 via-pink-500 to-purple-600',
    textColor: 'text-white',
    bgPattern: 'bg-gradient-to-br'
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    gradient: 'from-blue-400 via-cyan-500 to-teal-600',
    textColor: 'text-white',
    bgPattern: 'bg-gradient-to-tr'
  },
  {
    id: 'nature',
    name: 'Nature Green',
    gradient: 'from-green-400 via-emerald-500 to-teal-600',
    textColor: 'text-white',
    bgPattern: 'bg-gradient-to-bl'
  },
  {
    id: 'city',
    name: 'City Lights',
    gradient: 'from-gray-700 via-gray-900 to-black',
    textColor: 'text-yellow-300',
    bgPattern: 'bg-gradient-to-b'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    gradient: 'from-white to-gray-100',
    textColor: 'text-gray-900',
    bgPattern: 'bg-gradient-to-b'
  }
];

const posterFormats = [
  {
    id: 'instagram-story',
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    aspectRatio: '9/16'
  },
  {
    id: 'instagram-post',
    name: 'Instagram Post',
    width: 1080,
    height: 1080,
    aspectRatio: '1/1'
  },
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    width: 1200,
    height: 630,
    aspectRatio: '1200/630'
  }
];

export default function TripPosterGenerator({
  trip,
  activities,
  onClose
}: TripPosterGeneratorProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const hiddenPosterRef = useRef<HTMLDivElement>(null);
  const [selectedTheme, setSelectedTheme] = useState(posterThemes[0]);
  const [selectedFormat, setSelectedFormat] = useState(posterFormats[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showActivities, setShowActivities] = useState(true);

  // Calculate trip stats
  const tripDuration = Math.ceil(
    (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 
    (1000 * 60 * 60 * 24)
  ) + 1;

  const uniqueLocations = new Set(activities.map(a => a.locationName)).size;
  const totalActivities = activities.length;

  // Get top activities - limit based on format
  const maxActivities = selectedFormat.id === 'instagram-post' ? 3 : 
                       selectedFormat.id === 'facebook-post' ? 2 : 5;
  const topActivities = activities
    .filter(a => a.title)
    .slice(0, maxActivities)
    .map(a => a.title);

  const downloadPoster = async () => {
    if (!hiddenPosterRef.current) return;

    setIsGenerating(true);
    try {
      // Generate the canvas from the hidden full-size element
      const canvas = await html2canvas(hiddenPosterRef.current, {
        scale: 2, // Higher quality
        useCORS: true,
        backgroundColor: null
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${trip.title.replace(/\s+/g, '-')}-poster.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast({
            title: "Poster Downloaded!",
            description: "Your trip poster has been saved.",
          });
        }
      }, 'image/png');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate poster. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sharePoster = async () => {
    if (!hiddenPosterRef.current) return;

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(hiddenPosterRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${trip.title}-poster.png`, { type: 'image/png' });
          
          if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                title: `My ${trip.title} Trip`,
                text: `Check out my amazing trip to ${trip.city}! 🌍✈️`,
                files: [file]
              });
            } catch (err) {
              // User cancelled sharing
            }
          } else {
            // Fallback: Download the image
            downloadPoster();
          }
        }
      }, 'image/png');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share poster.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Create Trip Poster</h2>
              <p className="text-gray-600">Design a beautiful poster to share your trip</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <div className="grid grid-cols-3 gap-2">
                {posterFormats.map(format => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format)}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      selectedFormat.id === format.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{format.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {format.width}×{format.height}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                {posterThemes.map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedTheme.id === theme.id
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`h-8 rounded mb-2 ${theme.bgPattern} ${theme.gradient}`}></div>
                    <div className="text-xs font-medium">{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div>
              <label className="text-sm font-medium mb-2 block">Options</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showStats}
                    onChange={(e) => setShowStats(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Show trip statistics</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showActivities}
                    onChange={(e) => setShowActivities(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Show top activities</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={downloadPoster}
                disabled={isGenerating}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={sharePoster}
                disabled={isGenerating}
                variant="outline"
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
            <div
              ref={posterRef}
              className="bg-white shadow-xl rounded-lg overflow-hidden"
              style={{
                width: `${selectedFormat.width / 4}px`,
                height: `${selectedFormat.height / 4}px`,
                transform: 'scale(1)',
                transformOrigin: 'top left'
              }}
            >
              <div className={`h-full ${selectedTheme.bgPattern} ${selectedTheme.gradient} ${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'p-6' : 'p-8'} flex flex-col justify-between`}>
                {/* Header */}
                <div className={selectedTheme.textColor}>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-6 h-6" />
                    <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                      Travel Memory
                    </span>
                  </div>
                  
                  <h1 className={`${selectedFormat.id === 'instagram-post' ? 'text-2xl' : selectedFormat.id === 'facebook-post' ? 'text-3xl' : 'text-4xl'} font-bold mb-2`}>
                    {trip.title}
                  </h1>
                  
                  <div className={`${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'text-lg' : 'text-xl'} opacity-90`}>
                    {trip.city}{trip.country ? `, ${trip.country}` : ''}
                  </div>
                  
                  <div className="text-sm mt-2 opacity-80">
                    {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                  </div>
                </div>

                {/* Middle Content */}
                <div className={`flex-1 flex flex-col justify-center ${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'py-2' : ''}`}>
                  {showStats && (selectedFormat.id !== 'facebook-post' || !showActivities) && (
                    <div className={`grid grid-cols-3 gap-4 ${selectedFormat.id === 'instagram-post' ? 'mb-4' : 'mb-6'} ${selectedTheme.textColor}`}>
                      <div className="text-center">
                        <div className={`${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'text-2xl' : 'text-3xl'} font-bold`}>{tripDuration}</div>
                        <div className="text-xs uppercase opacity-80">Days</div>
                      </div>
                      <div className="text-center">
                        <div className={`${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'text-2xl' : 'text-3xl'} font-bold`}>{totalActivities}</div>
                        <div className="text-xs uppercase opacity-80">Activities</div>
                      </div>
                      <div className="text-center">
                        <div className={`${selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? 'text-2xl' : 'text-3xl'} font-bold`}>{uniqueLocations}</div>
                        <div className="text-xs uppercase opacity-80">Places</div>
                      </div>
                    </div>
                  )}

                  {showActivities && topActivities.length > 0 && (
                    <div className={`space-y-2 ${selectedTheme.textColor}`}>
                      <div className="text-xs uppercase opacity-80 mb-2">Highlights</div>
                      {topActivities.map((activity, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60"></div>
                          <div className="text-sm opacity-90">{activity}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className={`${selectedTheme.textColor} opacity-70`}>
                  <div className="text-xs">
                    Created with Remvana • remvana.com
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden full-size poster for generation */}
      <div 
        ref={hiddenPosterRef}
        className="fixed -left-[9999px] -top-[9999px]"
        style={{
          width: `${selectedFormat.width}px`,
          height: `${selectedFormat.height}px`
        }}
      >
        <div className={`h-full ${selectedTheme.bgPattern} ${selectedTheme.gradient} flex flex-col justify-between`}
          style={{
            padding: selectedFormat.id === 'instagram-post' ? '48px' : 
                     selectedFormat.id === 'facebook-post' ? '40px' : '64px'
          }}
        >
          {/* Header */}
          <div className={selectedTheme.textColor}>
            <div className="flex items-center gap-3" style={{ marginBottom: '32px' }}>
              <Sparkles style={{ width: '48px', height: '48px' }} />
              <span style={{ 
                fontSize: selectedFormat.id === 'facebook-post' ? '20px' : '24px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.9
              }}>
                Travel Memory
              </span>
            </div>
            
            <h1 style={{
              fontSize: selectedFormat.id === 'instagram-post' ? '64px' : 
                       selectedFormat.id === 'facebook-post' ? '56px' : '96px',
              fontWeight: 'bold',
              marginBottom: '16px',
              lineHeight: '1.1'
            }}>
              {trip.title}
            </h1>
            
            <div style={{
              fontSize: selectedFormat.id === 'instagram-post' ? '36px' : 
                       selectedFormat.id === 'facebook-post' ? '32px' : '48px',
              opacity: 0.9
            }}>
              {trip.city}{trip.country ? `, ${trip.country}` : ''}
            </div>
            
            <div style={{ fontSize: '24px', marginTop: '16px', opacity: 0.8 }}>
              {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Middle Content */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center',
            padding: selectedFormat.id === 'facebook-post' ? '20px 0' : '40px 0'
          }}>
            {showStats && (selectedFormat.id !== 'facebook-post' || !showActivities) && (
              <div className={selectedTheme.textColor} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '32px',
                marginBottom: selectedFormat.id === 'instagram-post' ? '48px' : '64px',
                textAlign: 'center'
              }}>
                <div>
                  <div style={{ 
                    fontSize: selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? '64px' : '72px',
                    fontWeight: 'bold' 
                  }}>{tripDuration}</div>
                  <div style={{ fontSize: '20px', textTransform: 'uppercase', opacity: 0.8 }}>Days</div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? '64px' : '72px',
                    fontWeight: 'bold' 
                  }}>{totalActivities}</div>
                  <div style={{ fontSize: '20px', textTransform: 'uppercase', opacity: 0.8 }}>Activities</div>
                </div>
                <div>
                  <div style={{ 
                    fontSize: selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? '64px' : '72px',
                    fontWeight: 'bold' 
                  }}>{uniqueLocations}</div>
                  <div style={{ fontSize: '20px', textTransform: 'uppercase', opacity: 0.8 }}>Places</div>
                </div>
              </div>
            )}

            {showActivities && topActivities.length > 0 && (
              <div className={selectedTheme.textColor}>
                <div style={{ 
                  fontSize: '20px', 
                  textTransform: 'uppercase', 
                  opacity: 0.8, 
                  marginBottom: '24px' 
                }}>Highlights</div>
                {topActivities.map((activity, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: 'currentColor',
                      opacity: 0.6
                    }}></div>
                    <div style={{ 
                      fontSize: selectedFormat.id === 'instagram-post' || selectedFormat.id === 'facebook-post' ? '28px' : '32px',
                      opacity: 0.9 
                    }}>{activity}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={selectedTheme.textColor} style={{ opacity: 0.7 }}>
            <div style={{ fontSize: '20px' }}>
              Created with Remvana • remvana.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}