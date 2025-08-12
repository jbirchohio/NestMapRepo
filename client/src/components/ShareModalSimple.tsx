import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Twitter, Facebook, Instagram, Link, Mail, MessageCircle,
  Copy, Check, Share2, QrCode, Download, X, MessageSquare,
  Send, Linkedin, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ClientTemplate } from '@/lib/types';
import QRCode from 'qrcode';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ClientTemplate;
  tripId?: string;
  shareUrl?: string;
  title?: string;
  description?: string;
}

export default function ShareModalSimple({
  isOpen,
  onClose,
  template,
  tripId,
  shareUrl: customShareUrl,
  title: customTitle,
  description: customDescription
}: ShareModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Generate share URL
  const shareUrl = customShareUrl ||
    (template ? `${window.location.origin}/templates/${template.slug}` :
     tripId ? `${window.location.origin}/share/${tripId}` :
     window.location.href);

  // Generate share content
  const title = customTitle || template?.title || 'Check out this amazing trip!';
  const description = customDescription || template?.description ||
    'I found this incredible travel itinerary on Remvana. Take a look!';

  // Generate QR code on mount
  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#ffffff'
        }
      }).then(setQrCodeUrl);
    }
  }, [isOpen, shareUrl]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share link has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
      sms: `sms:?body=${encodedTitle}%20${encodedUrl}`,
    };

    if (shareUrls[platform]) {
      if (platform === 'sms') {
        // SMS links work differently on different platforms
        window.location.href = shareUrls[platform];
      } else {
        window.open(shareUrls[platform], '_blank');
      }
    }
  };

  const downloadQR = () => {
    const link = document.createElement('a');
    link.download = `remvana-qr-${Date.now()}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '85vh',
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            zIndex: 10
          }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600">{description}</p>
          </div>

          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Share this link with friends to show them your trip
              </p>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleShare('twitter')}
                  className="justify-start"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('facebook')}
                  className="justify-start"
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('whatsapp')}
                  className="justify-start"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('sms')}
                  className="justify-start"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  SMS
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('telegram')}
                  className="justify-start"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Telegram
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('linkedin')}
                  className="justify-start"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('reddit')}
                  className="justify-start"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Reddit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare('email')}
                  className="justify-start"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              {qrCodeUrl && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <Button onClick={downloadQR} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                  <p className="text-sm text-gray-500 text-center">
                    Scan this code to quickly access the trip on mobile
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );

  // Portal to render at document body
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
}