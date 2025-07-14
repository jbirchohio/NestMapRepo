import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, AlertTriangle, User, Calendar, DollarSign } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ApprovalRequest {
  id: number;
  entityType: string;
  entityId: number;
  requestType: string;
  proposedData: Record<string, any>;
  reason?: string;
  businessJustification?: string;
  status: string;
  priority: string;
  dueDate?: string;
  escalationLevel: number;
  createdAt: string;
  requester: {
    id: number;
    displayName: string;
    email: string;
  };
}

const priorityConfig = {
  urgent: { color: 'destructive', icon: AlertTriangle },
  high: { color: 'orange', icon: AlertTriangle },
  normal: { color: 'blue', icon: Clock },
  low: { color: 'gray', icon: Clock }
} as const;

export default function Approvals() {
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['/api/approvals/pending'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: approvalRules } = useQuery({
    queryKey: ['/api/approvals/rules']
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, decision, reason }: { requestId: number; decision: string; reason?: string }) => {
      const response = await fetch(`/api/approvals/${requestId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision, reason })
      });
      if (!response.ok) {
        throw new Error('Failed to process approval');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/approvals/pending'] });
      setSelectedRequest(null);
      setRejectionReason('');
      toast({
        title: "Request processed",
        description: "The approval request has been processed successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process approval request",
        variant: "destructive"
      });
    }
  });

  const handleApprove = (request: ApprovalRequest) => {
    approveMutation.mutate({
      requestId: request.id,
      decision: 'approve'
    });
  };

  const handleReject = () => {
    if (!selectedRequest) return;
    
    approveMutation.mutate({
      requestId: selectedRequest.id,
      decision: 'reject',
      reason: rejectionReason
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getEntityDescription = (request: ApprovalRequest) => {
    const data = request.proposedData;
    
    switch (request.entityType) {
      case 'trip':
        return `${data.title || 'New Trip'} - ${data.destination || 'Unknown destination'}`;
      case 'expense':
        return `${data.description || 'Expense'} - ${formatAmount(data.amount || 0)}`;
      case 'booking':
        return `${data.type || 'Booking'} - ${formatAmount(data.totalAmount || 0)}`;
      default:
        return `${request.entityType} ${request.requestType}`;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approval Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Review and process approval requests</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Requests ({pendingRequests?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {!pendingRequests?.length ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No pending approvals
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All requests have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request: ApprovalRequest) => {
              const PriorityIcon = priorityConfig[request.priority as keyof typeof priorityConfig]?.icon || Clock;
              const isOverdue = request.dueDate && new Date(request.dueDate) < new Date();
              
              return (
                <Card key={request.id} className={`${isOverdue ? 'border-red-500' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {getEntityDescription(request)}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Requested by {request.requester.displayName}
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={priorityConfig[request.priority as keyof typeof priorityConfig]?.color as any}>
                          <PriorityIcon className="h-3 w-3 mr-1" />
                          {request.priority}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive">Overdue</Badge>
                        )}
                        {request.escalationLevel > 0 && (
                          <Badge variant="outline">Escalated</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {request.proposedData.totalAmount && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">
                            Amount: {formatAmount(request.proposedData.totalAmount)}
                          </span>
                        </div>
                      )}
                      
                      {request.dueDate && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span>
                            Due: {new Date(request.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {request.businessJustification && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            Business Justification
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.businessJustification}
                          </p>
                        </div>
                      )}
                      
                      {request.reason && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                            Request Reason
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {request.reason}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-4">
                        <Button
                          onClick={() => handleApprove(request)}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedRequest(request)}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Approval Rules</CardTitle>
              <CardDescription>
                Configure automatic approval rules for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvalRules?.length ? (
                <div className="space-y-4">
                  {approvalRules.map((rule: any) => (
                    <div key={rule.id} className="p-4 border rounded-lg">
                      <h3 className="font-medium">{rule.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Entity: {rule.entityType} | Auto-approve: {rule.autoApprove ? 'Yes' : 'No'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  No approval rules configured. Contact your administrator to set up approval workflows.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col space-y-1.5">
              <AlertDialogTitle>
                Reject Request
              </AlertDialogTitle>
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this request.
              </p>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || approveMutation.isPending}
              variant="destructive"
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
