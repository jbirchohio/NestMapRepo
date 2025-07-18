import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Key, 
  QrCode, 
  Copy, 
  Check, 
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MFAMethod {
  id: string;
  type: 'totp' | 'sms' | 'email' | 'backup_codes';
  identifier: string;
  isEnabled: boolean;
  isPrimary: boolean;
  createdAt: string;
  lastUsed?: string;
}

interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export default function MFASetup() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [totpSetup, setTotpSetup] = useState<TOTPSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Fetch user's MFA methods
  const { data: methods, isLoading, refetch } = useQuery<MFAMethod[]>({
    queryKey: ['/api/mfa/methods'],
    queryFn: () => apiRequest('/api/mfa/methods')
  });

  // Setup TOTP
  const setupTOTPMutation = useMutation({
    mutationFn: () => apiRequest('/api/mfa/setup/totp', { method: 'POST' }),
    onSuccess: (data: TOTPSetup) => {
      setTotpSetup(data);
      setActiveTab('totp');
      toast({
        title: 'TOTP Setup Started',
        description: 'Scan the QR code with your authenticator app'
      });
    },
    onError: (error) => {
      toast({
        title: 'Setup Failed',
        description: 'Failed to setup TOTP authentication',
        variant: 'destructive'
      });
    }
  });

  // Verify TOTP
  const verifyTOTPMutation = useMutation({
    mutationFn: (code: string) => apiRequest('/api/mfa/verify/totp', {
      method: 'POST',
      body: { code }
    }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'TOTP Enabled',
          description: 'Two-factor authentication has been successfully enabled'
        });
        setTotpSetup(null);
        setVerificationCode('');
        setShowBackupCodes(true);
        refetch();
      } else {
        toast({
          title: 'Verification Failed',
          description: 'Invalid verification code. Please try again.',
          variant: 'destructive'
        });
      }
    }
  });

  // Setup SMS
  const setupSMSMutation = useMutation({
    mutationFn: (phoneNumber: string) => apiRequest('/api/mfa/setup/sms', {
      method: 'POST',
      body: { phoneNumber }
    }),
    onSuccess: () => {
      toast({
        title: 'SMS Code Sent',
        description: 'Please check your phone for the verification code'
      });
    },
    onError: () => {
      toast({
        title: 'SMS Setup Failed',
        description: 'Failed to send SMS verification code',
        variant: 'destructive'
      });
    }
  });

  // Disable MFA method
  const disableMethodMutation = useMutation({
    mutationFn: (methodId: string) => apiRequest(`/api/mfa/methods/${methodId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      toast({
        title: 'MFA Method Disabled',
        description: 'The MFA method has been disabled'
      });
      refetch();
    },
    onError: () => {
      toast({
        title: 'Disable Failed',
        description: 'Failed to disable MFA method',
        variant: 'destructive'
      });
    }
  });

  const copyBackupCodes = () => {
    if (totpSetup?.backupCodes) {
      navigator.clipboard.writeText(totpSetup.backupCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
      toast({
        title: 'Backup Codes Copied',
        description: 'Store these codes in a safe place'
      });
    }
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'totp':
        return <Smartphone className="h-4 w-4" />;
      case 'sms':
        return <Mail className="h-4 w-4" />;
      case 'backup_codes':
        return <Key className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getMethodName = (type: string) => {
    switch (type) {
      case 'totp':
        return 'Authenticator App';
      case 'sms':
        return 'SMS';
      case 'backup_codes':
        return 'Backup Codes';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const enabledMethods = methods?.filter(m => m.isEnabled) || [];
  const hasMFAEnabled = enabledMethods.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Multi-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security to your account
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={hasMFAEnabled ? 'default' : 'secondary'}>
                    {hasMFAEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {hasMFAEnabled && (
                    <span className="text-sm text-muted-foreground">
                      {enabledMethods.length} method{enabledMethods.length !== 1 ? 's' : ''} active
                    </span>
                  )}
                </div>
              </div>
              {!hasMFAEnabled && (
                <Button onClick={() => setActiveTab('setup')}>
                  Enable MFA
                </Button>
              )}
            </div>

            {hasMFAEnabled && (
              <div className="space-y-3">
                <h4 className="font-medium">Active Methods</h4>
                {enabledMethods.map((method) => (
                  <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getMethodIcon(method.type)}
                      <div>
                        <p className="font-medium">{getMethodName(method.type)}</p>
                        <p className="text-sm text-muted-foreground">
                          {method.identifier}
                          {method.isPrimary && (
                            <Badge variant="outline" className="ml-2">Primary</Badge>
                          )}
                        </p>
                        {method.lastUsed && (
                          <p className="text-xs text-muted-foreground">
                            Last used: {new Date(method.lastUsed).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disableMethodMutation.mutate(method.id)}
                      disabled={disableMethodMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={activeTab === 'setup'} onOpenChange={(open) => !open && setActiveTab('overview')}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Setup Multi-Factor Authentication</DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Choose Method</TabsTrigger>
              <TabsTrigger value="totp">Authenticator App</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div className="grid gap-4">
                <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setupTOTPMutation.mutate()}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">Authenticator App</h3>
                        <p className="text-sm text-muted-foreground">
                          Use Google Authenticator, Authy, or similar apps
                        </p>
                        <Badge variant="outline" className="mt-1">Recommended</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setActiveTab('sms')}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-medium">SMS</h3>
                        <p className="text-sm text-muted-foreground">
                          Receive verification codes via text message
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="totp" className="space-y-4">
              {totpSetup && (
                <div className="space-y-4">
                  <Alert>
                    <QrCode className="h-4 w-4" />
                    <AlertDescription>
                      Scan this QR code with your authenticator app, then enter the 6-digit code below.
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-center">
                    <img 
                      src={totpSetup.qrCodeUrl} 
                      alt="QR Code for TOTP setup"
                      className="border rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verification-code">Verification Code</Label>
                    <Input
                      id="verification-code"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                    />
                  </div>

                  <Button 
                    onClick={() => verifyTOTPMutation.mutate(verificationCode)}
                    disabled={verificationCode.length !== 6 || verifyTOTPMutation.isPending}
                    className="w-full"
                  >
                    {verifyTOTPMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="sms" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertDescription>
                    Enter your phone number to receive verification codes via SMS.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    placeholder="+1 (555) 123-4567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={() => setupSMSMutation.mutate(phoneNumber)}
                  disabled={!phoneNumber || setupSMSMutation.isPending}
                  className="w-full"
                >
                  {setupSMSMutation.isPending ? 'Sending...' : 'Send Verification Code'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Backup Codes
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </AlertDescription>
            </Alert>

            {totpSetup?.backupCodes && (
              <div className="space-y-2">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  {totpSetup.backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={copyBackupCodes}
                  className="w-full"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Codes
                    </>
                  )}
                </Button>
              </div>
            )}

            <Button onClick={() => setShowBackupCodes(false)} className="w-full">
              I've Saved My Backup Codes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
