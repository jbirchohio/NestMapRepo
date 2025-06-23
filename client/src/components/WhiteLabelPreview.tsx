import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhiteLabelConfig } from '@/contexts/WhiteLabelContext';
import { Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
interface WhiteLabelPreviewProps {
    config: WhiteLabelConfig;
    isActive: boolean;
}
export default function WhiteLabelPreview({ config, isActive }: WhiteLabelPreviewProps) {
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [showPreview, setShowPreview] = useState(false);
    // Apply preview styling to iframe document
    const applyPreviewStyling = (iframe: HTMLIFrameElement | null) => {
        if (!iframe || !iframe.contentDocument)
            return;
        const doc = iframe.contentDocument;
        const root = doc.documentElement;
        // Helper function to convert hex color to HSL format for CSS variables
        function hexToHsl(hex: string): string {
            // Remove # if present
            hex = hex.replace('#', '');
            // Parse RGB values
            const r = parseInt(hex.substr(0, 2), 16) / 255;
            const g = parseInt(hex.substr(2, 2), 16) / 255;
            const b = parseInt(hex.substr(4, 2), 16) / 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                }
                h /= 6;
            }
            h = Math.round(h * 360);
            s = Math.round(s * 100);
            l = Math.round(l * 100);
            return `${h} ${s}% ${l}%`;
        }
        // Apply branding colors
        const primaryHsl = hexToHsl(config.primaryColor);
        const secondaryHsl = hexToHsl(config.secondaryColor);
        const accentHsl = hexToHsl(config.accentColor);
        // Set CSS variables
        root.style.setProperty('--primary', primaryHsl);
        root.style.setProperty('--secondary', secondaryHsl);
        root.style.setProperty('--accent', accentHsl);
        root.style.setProperty('--foreground', primaryHsl);
        root.style.setProperty('--muted-foreground', secondaryHsl);
        // Set hex values for components that might expect them
        root.style.setProperty('--primary-hex', config.primaryColor);
        root.style.setProperty('--secondary-hex', config.secondaryColor);
        root.style.setProperty('--accent-hex', config.accentColor);
        // Update title and favicon if provided
        doc.title = `${config.companyName} - Travel Management`;
        if (config.favicon) {
            const favicon = doc.querySelector('link[rel="icon"]');
            if (favicon) {
                favicon.setAttribute('href', config.favicon);
            }
        }
        // Update logo if provided
        const logoElements = doc.querySelectorAll('.company-logo');
        logoElements.forEach(el => {
            if (config.companyLogo) {
                (el as HTMLImageElement).src = config.companyLogo;
            }
        });
        // Update company name
        const companyNameElements = doc.querySelectorAll('.company-name');
        companyNameElements.forEach(el => {
            el.textContent = config.companyName;
        });
        // Update tagline if provided
        if (config.tagline) {
            const taglineElements = doc.querySelectorAll('.company-tagline');
            taglineElements.forEach(el => {
                el.textContent = config.tagline;
            });
        }
        // Update footer text if provided
        if (config.footerText) {
            const footerElements = doc.querySelectorAll('.footer-text');
            footerElements.forEach(el => {
                el.textContent = config.footerText;
            });
        }
    };
    // Handle iframe load event
    const handleIframeLoad = (event: React.SyntheticEvent<HTMLIFrameElement>) => {
        applyPreviewStyling(event.currentTarget);
    };
    // Update preview when config changes
    useEffect(() => {
        if (showPreview) {
            const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
            applyPreviewStyling(iframe);
        }
    }, [config, showPreview]);
    // Get preview dimensions based on device
    const getPreviewDimensions = () => {
        switch (previewDevice) {
            case 'mobile':
                return { width: '375px', height: '667px' };
            case 'tablet':
                return { width: '768px', height: '1024px' };
            case 'desktop':
            default:
                return { width: '100%', height: '600px' };
        }
    };
    const dimensions = getPreviewDimensions();
    return (<div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Preview Your Branding</h3>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-2">
          <Eye className="h-4 w-4"/>
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </Button>
      </div>
      
      {showPreview && (<Card>
          <CardContent className="p-4 space-y-4">
            <Tabs value={previewDevice} onValueChange={(v: string) => setPreviewDevice(v as 'desktop' | 'tablet' | 'mobile')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="desktop" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4"/>
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="tablet" className="flex items-center gap-2">
                  <Tablet className="h-4 w-4"/>
                  Tablet
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4"/>
                  Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="preview-container border rounded-md overflow-hidden" style={{
                width: dimensions.width,
                height: dimensions.height,
                margin: '0 auto'
            }}>
              <iframe id="preview-iframe" src="/preview-template" style={{
                width: '100%',
                height: '100%',
                border: 'none'
            }} title="White Label Preview" onLoad={handleIframeLoad}/>
            </div>
            
            <div className="text-sm text-muted-foreground text-center">
              This is a preview of how your branding will appear to your clients.
              {!isActive && (<div className="mt-2 text-orange-500">
                  Note: White label is not active. Upgrade your plan to enable white label features.
                </div>)}
            </div>
          </CardContent>
        </Card>)}
    </div>);
}
