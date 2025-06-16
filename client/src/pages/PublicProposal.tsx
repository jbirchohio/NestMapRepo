import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, Download, Eye, Calendar, Clock, CheckCircle, FileSignature } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublicProposalViewProps {
  proposalId: string;
}

export default function PublicProposal({ proposalId }: PublicProposalViewProps) {
  const [password, setPassword] = useState("");
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [viewStartTime] = useState(Date.now());
  const { toast } = useToast();

  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ["/api/public-proposals", proposalId, password],
    enabled: !isPasswordRequired || password.length > 0,
  });

  // Track analytics when proposal is viewed
  const trackView = useMutation({
    mutationFn: (eventData: any) => 
      apiRequest("POST", `/api/proposals/${proposalId}/analytics`, eventData),
  });

  const trackSectionView = useMutation({
    mutationFn: (section: string) => 
      apiRequest("POST", `/api/proposals/${proposalId}/analytics`, {
        eventType: "section_viewed",
        eventData: { section, timestamp: new Date().toISOString() }
      }),
  });

  const downloadPDF = useMutation({
    mutationFn: () => apiRequest("GET", `/api/proposals/${proposalId}/pdf`),
    onSuccess: () => {
      trackView.mutate({
        eventType: "downloaded",
        eventData: { timestamp: new Date().toISOString() }
      });
      toast({
        title: "Download Started",
        description: "Your proposal PDF is being downloaded.",
      });
    },
  });

  useEffect(() => {
    if (proposal) {
      // Track initial view
      trackView.mutate({
        eventType: "opened",
        eventData: { 
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      });

      // Track view duration when user leaves
      const trackViewDuration = () => {
        const duration = Math.round((Date.now() - viewStartTime) / 1000);
        trackView.mutate({
          eventType: "view_duration",
          eventData: { 
            duration,
            timestamp: new Date().toISOString()
          }
        });
      };

      window.addEventListener('beforeunload', trackViewDuration);
      return () => window.removeEventListener('beforeunload', trackViewDuration);
    }
  }, [proposal]);

  // Handle password protection
  if (error?.status === 401) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <CardTitle>Password Protected</CardTitle>
            <CardDescription>
              This proposal requires a password to view
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && window.location.reload()}
            />
            <Button 
              className="w-full" 
              onClick={() => window.location.reload()}
              disabled={!password}
            >
              Access Proposal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle expired proposals
  if (error?.status === 410) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Calendar className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <CardTitle>Proposal Expired</CardTitle>
            <CardDescription>
              This proposal link has expired and is no longer accessible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
              Please contact the sender for a new proposal link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Proposal Not Found</CardTitle>
            <CardDescription>
              The proposal you're looking for doesn't exist or has been removed
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSectionView = (section: string) => {
    trackSectionView.mutate(section);
  };

  const costBreakdown = proposal.proposalData?.costBreakdown || {
    flights: 2400,
    hotels: 1800,
    activities: 1200,
    meals: 800,
    transportation: 400,
    miscellaneous: 200
  };

  const totalCost = Object.values(costBreakdown).reduce((sum: number, cost: any) => sum + cost, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Travel Proposal
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                For {proposal.clientName}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>Prepared by {proposal.agentName}</span>
                <span>•</span>
                <span>{new Date(proposal.createdAt).toLocaleDateString()}</span>
                {proposal.linkExpiration && (
                  <>
                    <span>•</span>
                    <span className="text-orange-600">
                      Expires {new Date(proposal.linkExpiration).toLocaleDateString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => downloadPDF.mutate()}
                disabled={downloadPDF.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Trip Overview */}
        <Card onMouseEnter={() => handleSectionView("trip_overview")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Trip Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Destination</h4>
                <p className="text-gray-600 dark:text-gray-300">{proposal.trip?.city}, {proposal.trip?.country}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Duration</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {new Date(proposal.trip?.startDate).toLocaleDateString()} - {new Date(proposal.trip?.endDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Total Cost</h4>
                <p className="text-2xl font-bold text-blue-600">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card onMouseEnter={() => handleSectionView("cost_breakdown")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Cost Breakdown
            </CardTitle>
            <CardDescription>Detailed breakdown of all travel expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(costBreakdown).map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="capitalize font-medium">{category}</span>
                  <span className="font-bold">${(amount as number).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 text-lg font-bold border-t-2 border-blue-600">
                <span>Total</span>
                <span className="text-blue-600">${totalCost.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary */}
        <Card onMouseEnter={() => handleSectionView("itinerary")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-electric-600" />
              Detailed Itinerary
            </CardTitle>
            <CardDescription>Day-by-day breakdown of your travel experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {proposal.activities?.map((activity: any, index: number) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg px-2 py-1 text-sm font-medium">
                      {activity.time}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{activity.title}</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">{activity.locationName}</p>
                    {activity.notes && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{activity.notes}</p>
                    )}
                  </div>
                  {activity.tag && (
                    <Badge variant="secondary">{activity.tag}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Terms & Conditions */}
        <Card onMouseEnter={() => handleSectionView("terms")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-gray-600" />
              Terms & Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">Payment Terms</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  50% deposit required upon booking confirmation. Remaining balance due 30 days before departure.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Cancellation Policy</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Free cancellation up to 60 days before departure. 50% penalty between 30-60 days. 
                  Non-refundable within 30 days of departure.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Validity</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  This proposal is valid until {new Date(proposal.proposalData?.validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                  Prices subject to availability and may change.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        {proposal.signatureData?.signed ? (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-3 text-green-700 dark:text-green-300">
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">
                  Signed by {proposal.signatureData.signerName} on {new Date(proposal.signatureData.signedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Ready to Book?</CardTitle>
              <CardDescription>
                Contact us to proceed with this travel proposal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSectionView("contact_cta")}
                >
                  Accept Proposal
                </Button>
                <Button variant="outline" size="lg">
                  Request Changes
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                By accepting this proposal, you agree to the terms and conditions outlined above.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
          <p>{proposal.companyName} • {proposal.contactInfo?.email} • {proposal.contactInfo?.phone}</p>
          {proposal.contactInfo?.website && (
            <p className="mt-1">{proposal.contactInfo.website}</p>
          )}
        </div>
      </div>
    </div>
  );
}
