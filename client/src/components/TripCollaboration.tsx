import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, UserPlus, Share2, Copy, Mail,
  Check, X, Edit, Eye, Shield, MessageSquare,
  Bell, Settings, Link, QrCode, Phone,
  Globe, Lock, Unlock, Star, Crown,
  ChevronRight, Info, AlertCircle
} from 'lucide-react';

interface TripCollaborationProps {
  tripId: string;
  trip: any;
  currentUserId: string;
  onCollaboratorAdded?: (collaborator: any) => void;
  onPermissionsChanged?: (collaboratorId: string, permissions: any) => void;
}

interface Collaborator {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: Date;
  lastActive?: Date;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    canBook: boolean;
    canComment: boolean;
  };
}

export default function TripCollaboration({
  tripId,
  trip,
  currentUserId,
  onCollaboratorAdded,
  onPermissionsChanged
}: TripCollaborationProps) {
  const { toast } = useToast();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareSettings, setShareSettings] = useState({
    isPublic: false,
    allowJoinRequests: false,
    requireApproval: true,
    expiresIn: 'never' as 'never' | '7days' | '30days',
    maxCollaborators: 10
  });
  const [activeTab, setActiveTab] = useState('members');
  const [isLoading, setIsLoading] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    fetchCollaborators();
    generateShareLink();
  }, [tripId]);

  const fetchCollaborators = async () => {
    try {
      // Mock data for now
      const mockCollaborators: Collaborator[] = [
        {
          id: currentUserId,
          email: 'you@example.com',
          name: 'You',
          role: 'owner',
          status: 'active',
          joinedAt: new Date(trip.createdAt),
          lastActive: new Date(),
          permissions: {
            canEdit: true,
            canDelete: true,
            canInvite: true,
            canBook: true,
            canComment: true
          }
        }
      ];
      
      setCollaborators(mockCollaborators);
    } catch (error) {
      console.error('Failed to fetch collaborators:', error);
    }
  };

  const generateShareLink = () => {
    const baseUrl = window.location.origin;
    const shareCode = trip.shareCode || generateShareCode();
    setShareLink(`${baseUrl}/trip/join/${shareCode}`);
  };

  const generateShareCode = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleInviteCollaborator = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Send invitation
      const response = await fetch('/api/trips/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tripId,
          email: inviteEmail,
          message: inviteMessage,
          role: 'editor',
          shareLink
        })
      });

      if (response.ok) {
        const newCollaborator: Collaborator = {
          id: Date.now().toString(),
          email: inviteEmail,
          name: inviteEmail.split('@')[0],
          role: 'editor',
          status: 'pending',
          joinedAt: new Date(),
          permissions: {
            canEdit: true,
            canDelete: false,
            canInvite: false,
            canBook: true,
            canComment: true
          }
        };

        setCollaborators(prev => [...prev, newCollaborator]);
        setInviteEmail('');
        setInviteMessage('');
        
        toast({
          title: "✉️ Invitation Sent!",
          description: `Invitation sent to ${inviteEmail}`,
        });
        
        if (onCollaboratorAdded) {
          onCollaboratorAdded(newCollaborator);
        }
      }
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast({
        title: "Failed to send invitation",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
    toast({
      title: "Collaborator removed",
      description: "They no longer have access to this trip",
    });
  };

  const handleChangeRole = (collaboratorId: string, newRole: 'editor' | 'viewer') => {
    setCollaborators(prev => prev.map(c => {
      if (c.id === collaboratorId) {
        const newPermissions = newRole === 'editor' ? {
          canEdit: true,
          canDelete: false,
          canInvite: false,
          canBook: true,
          canComment: true
        } : {
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canBook: false,
          canComment: true
        };
        
        if (onPermissionsChanged) {
          onPermissionsChanged(collaboratorId, newPermissions);
        }
        
        return { ...c, role: newRole, permissions: newPermissions };
      }
      return c;
    }));
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link copied!",
      description: "Share this link with your travel companions",
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'editor': return Edit;
      case 'viewer': return Eye;
      default: return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'purple';
      case 'editor': return 'blue';
      case 'viewer': return 'green';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span>Trip Collaboration</span>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
              {collaborators.length} {collaborators.length === 1 ? 'member' : 'members'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Invite friends and family to help plan and join your trip. Share access to view or edit the itinerary.
          </p>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="invite">Invite</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="space-y-3">
            {collaborators.map((collaborator) => {
              const RoleIcon = getRoleIcon(collaborator.role);
              const roleColor = getRoleColor(collaborator.role);
              
              return (
                <motion.div
                  key={collaborator.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={collaborator.avatar} />
                            <AvatarFallback>
                              {collaborator.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{collaborator.name}</h4>
                              {collaborator.id === currentUserId && (
                                <Badge variant="secondary" className="text-xs">You</Badge>
                              )}
                              {collaborator.status === 'pending' && (
                                <Badge variant="outline" className="text-xs">Pending</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{collaborator.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className={`bg-${roleColor}-100 text-${roleColor}-700 border-${roleColor}-300`}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {collaborator.role}
                          </Badge>
                          
                          {collaborator.role !== 'owner' && collaborator.id !== currentUserId && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleChangeRole(
                                  collaborator.id, 
                                  collaborator.role === 'editor' ? 'viewer' : 'editor'
                                )}
                              >
                                {collaborator.role === 'editor' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCollaborator(collaborator.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Permissions */}
                      {collaborator.role !== 'owner' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          {collaborator.permissions.canEdit && (
                            <Badge variant="secondary" className="text-xs">
                              <Edit className="w-3 h-3 mr-1" />
                              Can Edit
                            </Badge>
                          )}
                          {collaborator.permissions.canBook && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Can Book
                            </Badge>
                          )}
                          {collaborator.permissions.canComment && (
                            <Badge variant="secondary" className="text-xs">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Can Comment
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* Invite Tab */}
        <TabsContent value="invite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invite by Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="friend@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Input
                  id="message"
                  placeholder="Hey! Want to join our trip to Paris?"
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>
              
              <Button
                onClick={handleInviteCollaborator}
                disabled={isLoading || !inviteEmail}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Invitation
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={copyShareLink}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRCode(!showQRCode)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const text = `Join our trip! ${shareLink}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {showQRCode && (
                <div className="p-4 bg-white rounded-lg text-center">
                  <div className="w-48 h-48 mx-auto bg-gray-200 rounded flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">QR Code for easy sharing</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sharing Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Trip</Label>
                  <p className="text-xs text-gray-500">Anyone with the link can view</p>
                </div>
                <Button
                  variant={shareSettings.isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareSettings(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                >
                  {shareSettings.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow Join Requests</Label>
                  <p className="text-xs text-gray-500">Let people request to join</p>
                </div>
                <Button
                  variant={shareSettings.allowJoinRequests ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareSettings(prev => ({ ...prev, allowJoinRequests: !prev.allowJoinRequests }))}
                >
                  {shareSettings.allowJoinRequests ? "Yes" : "No"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Require Approval</Label>
                  <p className="text-xs text-gray-500">Approve new members manually</p>
                </div>
                <Button
                  variant={shareSettings.requireApproval ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShareSettings(prev => ({ ...prev, requireApproval: !prev.requireApproval }))}
                >
                  {shareSettings.requireApproval ? "Required" : "Auto-accept"}
                </Button>
              </div>

              <div>
                <Label>Link Expiration</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={shareSettings.expiresIn === 'never' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShareSettings(prev => ({ ...prev, expiresIn: 'never' }))}
                  >
                    Never
                  </Button>
                  <Button
                    variant={shareSettings.expiresIn === '7days' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShareSettings(prev => ({ ...prev, expiresIn: '7days' }))}
                  >
                    7 Days
                  </Button>
                  <Button
                    variant={shareSettings.expiresIn === '30days' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShareSettings(prev => ({ ...prev, expiresIn: '30days' }))}
                  >
                    30 Days
                  </Button>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Changes to sharing settings will apply to new share links only
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}