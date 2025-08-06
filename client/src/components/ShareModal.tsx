import React, { useState } from 'react';
import { 
  Twitter, Facebook, Instagram, Link, Mail, MessageCircle,
  Copy, Check, Share2, QrCode, Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function ShareModal({
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

  // Generate share URL
  const shareUrl = customShareUrl || 
    (template ? `${window.location.origin}/templates/${template.slug}` :
     tripId ? `${window.location.origin}/share/${tripId}` :
     window.location.href);

  // Generate share content
  const title = customTitle || template?.title || 'Check out this amazing trip!';
  const description = customDescription || template?.description || 
    'I found this perfect travel itinerary on Remvana!';

  // Generate QR code
  React.useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(shareUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#7c3aed',
          light: '#ffffff'
        }
      }).then(setQrCodeUrl).catch(console.error);
    }
  }, [isOpen, shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'The link has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please try again or copy manually.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    
    let shareLink = '';
    
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&hashtags=travel,remvana`;
        break;
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'email':
        shareLink = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`;
        break;
      case 'pinterest':
        const imageUrl = template?.coverImage || '';
        shareLink = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodeURIComponent(imageUrl)}&description=${encodedTitle}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'reddit':
        shareLink = `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }

    // Track share if template
    if (template && platform !== 'copy') {
      fetch(`/api/templates/${template.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      }).catch(console.error);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
        toast({
          title: 'Shared successfully!',
        });
      } catch (error) {
        // User cancelled or error occurred
        console.error('Share failed:', error);
      }
    } else {
      handleCopy();
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-')}-qr.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {template ? 'Template' : 'Trip'}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="social" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          {/* Social Media Tab */}
          <TabsContent value="social" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-5 w-5 text-[#1DA1F2]" />
                <span className="text-xs">Twitter</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-5 w-5 text-[#1877F2]" />
                <span className="text-xs">Facebook</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('whatsapp')}
              >
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('telegram')}
              >
                <Send className="h-5 w-5 text-[#0088cc]" />
                <span className="text-xs">Telegram</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-5 w-5" />
                <span className="text-xs">Email</span>
              </Button>
              
              <Button
                variant="outline"
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => handleShare('pinterest')}
              >
                <div className="h-5 w-5 text-[#E60023]">📌</div>
                <span className="text-xs">Pinterest</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleShare('linkedin')}
              >
                LinkedIn
              </Button>
              <Button
                variant="outline"
                onClick={() => handleShare('reddit')}
              >
                Reddit
              </Button>
            </div>

            {navigator.share && (
              <Button 
                className="w-full"
                onClick={handleNativeShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                More Sharing Options
              </Button>
            )}
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                value={shareUrl}
                className="flex-1"
              />
              <Button
                size="icon"
                variant={copied ? 'default' : 'outline'}
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Embed Code for Templates */}
            {template && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Embed on your website:</p>
                <div className="relative">
                  <Input
                    readOnly
                    value={`<iframe src="${shareUrl}/embed" width="100%" height="400" frameborder="0"></iframe>`}
                    className="font-mono text-xs pr-10"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `<iframe src="${shareUrl}/embed" width="100%" height="400" frameborder="0"></iframe>`
                      );
                      toast({ title: 'Embed code copied!' });
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {qrCodeUrl ? (
                <>
                  <div className="p-4 bg-white rounded-lg border">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-center text-gray-600">
                    Scan this QR code to view the {template ? 'template' : 'trip'}
                  </p>
                  <Button
                    variant="outline"
                    onClick={downloadQRCode}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>
                </>
              ) : (
                <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Share Stats for Templates */}
        {template && template.viewCount > 0 && (
          <div className="mt-4 p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-900">
              <strong>🔥 {template.viewCount}</strong> people have viewed this template
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Send icon component (Telegram uses a paper plane)
function Send({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}