import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, User, Building, Mail, Phone, Globe, Download, Calculator } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
interface ProposalGeneratorProps {
    tripId: number;
    tripTitle: string;
}
export default function ProposalGenerator({ tripId, tripTitle }: ProposalGeneratorProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [formData, setFormData] = useState({
        clientName: "",
        agentName: "",
        companyName: "NestMap Travel Services",
        proposalNotes: "",
        contactEmail: "",
        contactPhone: "",
        contactWebsite: ""
    });
    const [selectedProposal, setSelectedProposal] = useState<any>(null);
    const [signature, setSignature] = useState({ signedBy: "", signatureImage: "" });
    // Fetch real cost estimate from API
    const { data: costEstimate, isLoading: loadingCost } = useQuery({
        queryKey: ['/api/trips', tripId, 'cost-estimate'],
        queryFn: async () => {
            const response = await apiRequest("GET", `/api/trips/${tripId}/cost-estimate`);
            if (!response.ok) {
                throw new Error("Failed to fetch cost estimate");
            }
            return response.json();
        }
    });
    // Fetch proposals for this trip
    const { data: proposals, refetch: refetchProposals } = useQuery({
        queryKey: ['/api/proposals', { tripId }],
        queryFn: async () => {
            const response = await apiRequest("GET", `/api/proposals?tripId=${tripId}`);
            if (!response.ok)
                throw new Error("Failed to fetch proposals");
            return response.json();
        }
    });
    // Create proposal
    const createProposal = useMutation({
        mutationFn: async (data: any) => {
            const response = await apiRequest("POST", `/api/proposals`, data);
            if (!response.ok)
                throw new Error("Failed to save proposal");
            return response.json();
        },
        onSuccess: (data) => {
            setSelectedProposal(data);
            queryClient.invalidateQueries({ queryKey: ['/api/proposals', { tripId }] });
            toast({ title: "Proposal saved!", description: "Your proposal has been saved and is ready for approval/updates." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to save proposal", variant: "destructive" });
        }
    });
    // Update proposal status
    const updateProposalStatus = useMutation({
        mutationFn: async ({ id, status }: {
            id: string;
            status: string;
        }) => {
            const response = await apiRequest("PATCH", `/api/proposals/${id}/status`, { status });
            if (!response.ok)
                throw new Error("Failed to update status");
            return response.json();
        },
        onSuccess: (data) => {
            setSelectedProposal(data);
            queryClient.invalidateQueries({ queryKey: ['/api/proposals', { tripId }] });
            toast({ title: "Proposal status updated" });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    });
    // Sign proposal
    const signProposal = useMutation({
        mutationFn: async ({ id, signedBy, signatureImage }: {
            id: string;
            signedBy: string;
            signatureImage?: string;
        }) => {
            const response = await apiRequest("PATCH", `/api/proposals/${id}/sign`, { signedBy, signatureImage });
            if (!response.ok)
                throw new Error("Failed to sign proposal");
            return response.json();
        },
        onSuccess: (data) => {
            setSelectedProposal(data);
            queryClient.invalidateQueries({ queryKey: ['/api/proposals', { tripId }] });
            toast({ title: "Proposal signed!", description: "Proposal is now ready for invoicing." });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to sign proposal", variant: "destructive" });
        }
    });
    // Load latest proposal for trip on mount or when proposals change
    useEffect(() => {
        if (proposals && proposals.length > 0) {
            setSelectedProposal(proposals[0]); // Use most recent or allow selection
        }
    }, [proposals]);
    // Generate actual PDF proposal
    const generateProposal = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await apiRequest("POST", `/api/trips/${tripId}/generate-proposal`, data);
            if (!response.ok) {
                throw new Error("Failed to generate proposal");
            }
            return response.blob();
        },
        onSuccess: (blob) => {
            // Download the PDF
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Travel_Proposal_${formData.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${tripTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({
                title: "Proposal Generated!",
                description: "Your professional travel proposal has been downloaded successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Generation Failed",
                description: "Failed to generate proposal. Please try again.",
                variant: "destructive",
            });
        }
    });
    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    const handleSaveProposal = () => {
        if (!formData.clientName || !formData.contactEmail) {
            toast({
                title: "Missing Information",
                description: "Please provide client name and contact email.",
                variant: "destructive",
            });
            return;
        }
        const payload = {
            tripId,
            clientName: formData.clientName,
            agentName: formData.agentName,
            companyName: formData.companyName,
            proposalNotes: formData.proposalNotes,
            clientEmail: formData.contactEmail,
            clientPhone: formData.contactPhone,
            contactInfo: {
                email: formData.contactEmail,
                phone: formData.contactPhone,
                website: formData.contactWebsite
            },
            estimatedCost: costEstimate?.estimatedCost || 0,
            costBreakdown: costEstimate?.costBreakdown || {},
            status: "draft"
        };
        createProposal.mutate(payload);
    };
    const handleStatusChange = (status: string) => {
        if (!selectedProposal)
            return;
        updateProposalStatus.mutate({ id: selectedProposal.id, status });
    };
    const handleSignProposal = () => {
        if (!selectedProposal)
            return;
        if (!signature.signedBy) {
            toast({ title: "Signer name required", description: "Please enter the signer's name.", variant: "destructive" });
            return;
        }
        signProposal.mutate({ id: selectedProposal.id, signedBy: signature.signedBy, signatureImage: signature.signatureImage });
    };
    const handleConvertToInvoice = () => {
        if (!selectedProposal)
            return;
        // Navigate to InvoiceCenter with selected proposalId
        navigate(`/invoice-center?proposalId=${selectedProposal.id}`);
    };
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };
    return (<div className="space-y-6">
      {/* Proposal Status & Actions */}
      {selectedProposal && (<div className="flex flex-wrap items-center gap-4 justify-between p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Status: {selectedProposal.status}</Badge>
            {selectedProposal.status === 'signed' && <Badge variant="success">Ready to Invoice</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {selectedProposal.status !== 'signed' && (<Button size="sm" onClick={() => handleStatusChange('sent')}>Mark as Sent</Button>)}
            {selectedProposal.status === 'sent' && (<Button size="sm" onClick={() => handleStatusChange('viewed')}>Mark as Viewed</Button>)}
            {selectedProposal.status !== 'signed' && (<Button size="sm" onClick={() => handleStatusChange('rejected')} variant="destructive">Reject</Button>)}
            {selectedProposal.status !== 'signed' && (<Button size="sm" onClick={() => handleStatusChange('expired')}>Expire</Button>)}
            {selectedProposal.status !== 'signed' && (<Button size="sm" onClick={() => handleStatusChange('cancelled')}>Cancel</Button>)}
            {selectedProposal.status !== 'signed' && (<Button size="sm" onClick={() => handleStatusChange('signed')}>Mark as Signed</Button>)}
            {selectedProposal.status === 'signed' && (<Button size="sm" variant="success" onClick={handleConvertToInvoice}>Convert to Invoice</Button>)}
          </div>
        </div>)}

      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-blue-600"/>
        <div>
          <h2 className="text-2xl font-bold">AI Proposal Generator</h2>
          <p className="text-gray-600">Create professional travel proposals with AI-powered cost estimates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Estimate Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5"/>
              Cost Estimate
            </CardTitle>
            <CardDescription>AI-powered pricing for {tripTitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCost ? (<div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>) : costEstimate ? (<div className="space-y-4">
                {/* Total Cost */}
                <div className="text-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
                  <div className="text-3xl font-bold">{formatCurrency(costEstimate.estimatedCost)}</div>
                  <div className="text-sm opacity-90">Total Estimated Cost</div>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Cost Breakdown</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">✈️ Flights</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.flights)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🏨 Hotels</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.hotels)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🎯 Activities</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.activities)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🍽️ Meals</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.meals)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">🚗 Transport</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.transportation)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">📝 Misc</span>
                      <span className="font-medium">{formatCurrency(costEstimate.costBreakdown.miscellaneous)}</span>
                    </div>
                  </div>
                </div>
              </div>) : (<div className="text-center text-gray-500 py-4">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50"/>
                <p>Cost estimate unavailable</p>
              </div>)}
          </CardContent>
        </Card>

        {/* Proposal Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5"/>
              Proposal Details
            </CardTitle>
            <CardDescription>Customize your professional travel proposal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4"/>
                Client Information
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input id="clientName" value={formData.clientName} onChange={(e) => handleInputChange('clientName', e.target.value)} placeholder="John Smith" required/>
                </div>
              </div>
            </div>

            <Separator />

            {/* Agent/Company Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building className="h-4 w-4"/>
                Agent & Company
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input id="agentName" value={formData.agentName} onChange={(e) => handleInputChange('agentName', e.target.value)} placeholder="Travel Professional"/>
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={formData.companyName} onChange={(e) => handleInputChange('companyName', e.target.value)} placeholder="NestMap Travel Services"/>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4"/>
                Contact Information
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="contactEmail">Email *</Label>
                  <Input id="contactEmail" type="email" value={formData.contactEmail} onChange={(e) => handleInputChange('contactEmail', e.target.value)} placeholder="agent@nestmap.com" required/>
                </div>
                <div>
                  <Label htmlFor="contactPhone">Phone</Label>
                  <Input id="contactPhone" value={formData.contactPhone} onChange={(e) => handleInputChange('contactPhone', e.target.value)} placeholder="+1 (555) 123-4567"/>
                </div>
                <div>
                  <Label htmlFor="contactWebsite">Website</Label>
                  <Input id="contactWebsite" value={formData.contactWebsite} onChange={(e) => handleInputChange('contactWebsite', e.target.value)} placeholder="https://nestmap.com"/>
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="proposalNotes">Additional Notes</Label>
              <Textarea id="proposalNotes" value={formData.proposalNotes} onChange={(e) => handleInputChange('proposalNotes', e.target.value)} placeholder="This customized travel proposal has been carefully crafted..." rows={3}/>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Proposal & Signature */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
        <Button onClick={handleSaveProposal} disabled={createProposal.isPending || !formData.clientName || !formData.contactEmail} size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          {createProposal.isPending ? (<>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Saving Proposal...
            </>) : (<>
              <Download className="h-4 w-4 mr-2"/>
              Save/Update Proposal
            </>)}
        </Button>
        {/* Signature UI */}
        {selectedProposal && selectedProposal.status !== 'signed' && (<div className="flex flex-col gap-2 items-center">
            <Input placeholder="Signer Name" value={signature.signedBy} onChange={e => setSignature(s => ({ ...s, signedBy: e.target.value }))} className="max-w-xs"/>
            <Button size="sm" onClick={handleSignProposal} disabled={signProposal.isPending || !signature.signedBy} variant="secondary">
              {signProposal.isPending ? 'Signing...' : 'Sign Proposal'}
            </Button>
          </div>)}
      </div>

      {/* Features Badge */}
      <div className="text-center">
        <div className="inline-flex flex-wrap gap-2 justify-center">
          <Badge variant="secondary" className="text-xs">
            AI-Powered Pricing
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Professional Branding
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Instant Download
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Cost Breakdown
          </Badge>
        </div>
      </div>
    </div>);
}
