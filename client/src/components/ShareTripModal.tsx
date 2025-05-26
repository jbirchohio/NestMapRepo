import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ClientTrip } from "@/lib/types";
import { nanoid } from 'nanoid';
import { Copy, CheckCircle, Link } from "lucide-react";

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: ClientTrip | null;
  onSave: (tripId: number, updates: Partial<ClientTrip>) => Promise<void>;
}

export default function ShareTripModal({
  isOpen,
  onClose,
  trip,
  onSave,
}: ShareTripModalProps) {
  const [shareLink, setShareLink] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const [sharePermission, setSharePermission] = useState<"read-only" | "edit">("read-only");
  const [copied, setCopied] = useState(false);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (trip) {
      setIsPublic(trip.isPublic || false);
      setSharingEnabled(trip.sharingEnabled || false);
      setSharePermission((trip as any).sharePermission || "read-only");
      
      // Generate share link with permission parameter
      const baseUrl = window.location.origin;
      const shareCode = trip.shareCode || '';
      const permission = (trip as any).sharePermission || "read-only";
      setShareLink(`${baseUrl}/share/${shareCode}?permission=${permission}`);
      
      // Set collaborators
      setCollaborators(trip.collaborators as string[] || []);
    }
  }, [trip]);

  const generateShareCode = () => {
    return nanoid(8); // Generate a short unique ID for sharing
  };

  const handleTogglePublic = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
  };

  const handleToggleSharing = async () => {
    const newValue = !sharingEnabled;
    setSharingEnabled(newValue);
    
    if (newValue && trip && !trip.shareCode) {
      // Generate a share code if sharing is enabled
      const updates = {
        shareCode: generateShareCode(),
        sharingEnabled: newValue
      };
      try {
        await onSave(trip.id, updates);
      } catch (error) {
        console.error("Error updating share settings:", error);
        toast({
          title: "Error",
          description: "Failed to update sharing settings",
          variant: "destructive",
        });
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(
      () => {
        setCopied(true);
        toast({
          title: "Link copied",
          description: "Share link copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy link: ", err);
        toast({
          title: "Error",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    );
  };

  const handleAddCollaborator = () => {
    if (!collaboratorEmail) return;
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(collaboratorEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    if (!collaborators.includes(collaboratorEmail)) {
      const newCollaborators = [...collaborators, collaboratorEmail];
      setCollaborators(newCollaborators);
      setCollaboratorEmail("");
      
      if (trip) {
        // Save to database
        onSave(trip.id, { collaborators: newCollaborators });
      }
    } else {
      toast({
        title: "Already added",
        description: "This email is already in the collaborators list",
        variant: "destructive",
      });
    }
  };

  const handleRemoveCollaborator = (email: string) => {
    const newCollaborators = collaborators.filter(c => c !== email);
    setCollaborators(newCollaborators);
    
    if (trip) {
      // Save to database
      onSave(trip.id, { collaborators: newCollaborators });
    }
  };

  const handleSave = async () => {
    if (!trip) return;
    
    setIsLoading(true);
    try {
      // Only generate a share code if sharing is enabled and no code exists
      const shareCode = sharingEnabled && !trip.shareCode ? generateShareCode() : trip.shareCode;
      
      await onSave(trip.id, {
        isPublic,
        sharingEnabled,
        shareCode: sharingEnabled ? shareCode : null,
        collaborators
      });
      
      toast({
        title: "Settings saved",
        description: "Sharing settings have been updated",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving share settings:", error);
      toast({
        title: "Error",
        description: "Failed to save sharing settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Configure sharing settings for your trip.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link">
          <TabsList className="mb-4">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
          </TabsList>
          
          <TabsContent value="link" className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="public" className="flex-1">Make trip public</Label>
              <Switch 
                id="public" 
                checked={isPublic} 
                onCheckedChange={handleTogglePublic} 
              />
            </div>
            
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="sharing" className="flex-1">Enable sharing via link</Label>
              <Switch 
                id="sharing" 
                checked={sharingEnabled} 
                onCheckedChange={handleToggleSharing} 
              />
            </div>
            
            {sharingEnabled && (
              <div className="space-y-2">
                <Label htmlFor="shareLink">Share link</Label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input 
                      id="shareLink" 
                      value={shareLink} 
                      readOnly 
                      disabled={!sharingEnabled}
                    />
                    {copied && (
                      <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    disabled={!sharingEnabled}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can view your trip{isPublic ? ' and it may appear in search results' : ''}.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="collaborators" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="collaborator">Add collaborator by email</Label>
              <div className="flex items-center space-x-2">
                <Input 
                  id="collaborator" 
                  placeholder="Email address"
                  value={collaboratorEmail}
                  onChange={(e) => setCollaboratorEmail(e.target.value)}
                />
                <Button 
                  type="button"
                  onClick={handleAddCollaborator}
                >
                  Add
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Current collaborators</Label>
              {collaborators.length === 0 ? (
                <p className="text-sm text-muted-foreground">No collaborators added yet.</p>
              ) : (
                <div className="space-y-2">
                  {collaborators.map((email) => (
                    <div 
                      key={email} 
                      className="flex items-center justify-between bg-secondary p-2 rounded-md"
                    >
                      <div className="flex items-center space-x-2">
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <span>{email}</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveCollaborator(email)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Collaborators will need to create an account to edit the trip.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}