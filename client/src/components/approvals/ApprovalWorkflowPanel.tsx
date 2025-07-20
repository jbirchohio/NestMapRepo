import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 

  AlertTriangle,
  FileText,
  Calendar,
  DollarSign,
  ArrowRight,
  Send
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  entityType: 'trip' | 'expense' | 'booking' | 'policy_exception';
  entityId: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requiredApprovers: ApprovalLevel[];
  currentLevel: number;
  approvals: ApprovalAction[];
  requestedAt: string;
  dueDate?: string;
  businessJustification?: string;
  policyViolations?: string[];
  requesterName: string;
  requesterEmail: string;
}

interface ApprovalLevel {
  level: number;
  name: string;
  approverRoles: string[];
  requiresAll: boolean;
  isOptional: boolean;
  timeoutHours?: number;
}

interface ApprovalAction {
  id: string;
  level: number;
  approverId: number;
  approverName: string;
  action: 'approved' | 'rejected' | 'delegated';
  timestamp: string;
  comments?: string;
}

interface ApprovalComment {
  id: string;
  userId: number;
  userName: string;
  comment: string;
  timestamp: string;
  isInternal: boolean;
}

export default function ApprovalWorkflowPanel() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [actionComments, setActionComments] = useState('');
  const [newComment, setNewComment] = useState('');

  // Fetch approval requests
  const { data: requests, isLoading, refetch } = useQuery<ApprovalRequest[]>({
    queryKey: ['/api/approvals/requests'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/approvals/requests');
      return response.data;
    }
  });

  // Fetch comments for selected request
  const { data: comments } = useQuery<ApprovalComment[]>({
    queryKey: ['/api/approvals/requests', selectedRequest?.id, 'comments'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/approvals/requests/${selectedRequest?.id}/comments`);
      return response.data;
    },
    enabled: !!selectedRequest?.id
  });

  // Process approval action
  const processApprovalMutation = useMutation({
    mutationFn: async ({ requestId, action, comments }: { 
      requestId: string; 
      action: 'approved' | 'rejected'; 
      comments?: string 
    }) => {
      const response = await apiRequest('POST', `/api/approvals/requests/${requestId}/process`, { action, comments });
      return response;
    },
    onSuccess: (_, variables) => {
      toast({
        title: `Request ${variables.action === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The approval request has been ${variables.action}`
      });
      setActionComments('');
      setShowRequestDialog(false);
      refetch();
    },
    onError: () => {
      toast({
        title: 'Action Failed',
        description: 'Failed to process approval request',
        variant: 'destructive'
      });
    }
  });

  // Add comment
  const addCommentMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment: string }) => {
      const response = await apiRequest('POST', `/api/approvals/requests/${requestId}/comments`, { comment });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Comment Added',
        description: 'Your comment has been added to the request'
      });
      setNewComment('');
    },
    onError: () => {
      toast({
        title: 'Comment Failed',
        description: 'Failed to add comment',
        variant: 'destructive'
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'secondary';
      case 'normal':
        return 'outline';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'trip':
        return <Calendar className="h-4 w-4" />;
      case 'expense':
        return <DollarSign className="h-4 w-4" />;
      case 'booking':
        return <FileText className="h-4 w-4" />;
      case 'policy_exception':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const canApprove = (request: ApprovalRequest) => {
    if (!user || request.status !== 'pending') return false;
    
    const currentLevelConfig = request.requiredApprovers.find(
      level => level.level === request.currentLevel
    );
    
    if (!currentLevelConfig) return false;
    
    // Check if user has required role
    return currentLevelConfig.approverRoles.includes(user.role);
  };

  const hasAlreadyApproved = (request: ApprovalRequest) => {
    if (!user?.id) return false;
    return request.approvals.some(approval => 
      approval.approverId === Number(user.id) && approval.level === request.currentLevel
    );
  };

  const filteredRequests = requests?.filter(request => {
    switch (activeTab) {
      case 'pending':
        return request.status === 'pending';
      case 'approved':
        return request.status === 'approved';
      case 'rejected':
        return request.status === 'rejected';
      case 'my-requests':
        return request.requesterEmail === user?.email;
      default:
        return true;
    }
  }) || [];

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">
                Pending ({requests?.filter(r => r.status === 'pending').length || 0})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowRequestDialog(true);
                        }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getEntityIcon(request.entityType)}
                          <div className="flex-1">
                            <h4 className="font-medium">{request.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {request.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={getStatusColor(request.status)}>
                                {getStatusIcon(request.status)}
                                {request.status}
                              </Badge>
                              <Badge variant={getPriorityColor(request.priority)}>
                                {request.priority}
                              </Badge>
                              <Badge variant="outline">{request.entityType}</Badge>
                              {request.policyViolations && request.policyViolations.length > 0 && (
                                <Badge variant="destructive">
                                  {request.policyViolations.length} Policy Violations
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>By {request.requesterName}</span>
                              <span>{new Date(request.requestedAt).toLocaleDateString()}</span>
                              {request.dueDate && (
                                <span>Due: {new Date(request.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canApprove(request) && !hasAlreadyApproved(request) && (
                            <Badge variant="outline">Action Required</Badge>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredRequests.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Requests Found</h3>
                      <p className="text-muted-foreground">
                        {activeTab === 'pending' 
                          ? 'No pending approval requests at this time.'
                          : `No ${activeTab.replace('-', ' ')} requests found.`}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && getEntityIcon(selectedRequest.entityType)}
              {selectedRequest?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(selectedRequest.status)}>
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status}
                  </Badge>
                  <Badge variant={getPriorityColor(selectedRequest.priority)}>
                    {selectedRequest.priority}
                  </Badge>
                  <Badge variant="outline">{selectedRequest.entityType}</Badge>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.description}</p>
                </div>

                {selectedRequest.businessJustification && (
                  <div>
                    <h4 className="font-medium mb-2">Business Justification</h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.businessJustification}</p>
                  </div>
                )}

                {selectedRequest.policyViolations && selectedRequest.policyViolations.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Policy Violations</h4>
                    <div className="space-y-2">
                      {selectedRequest.policyViolations.map((violation, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{violation}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Requested by:</span>
                    <p className="text-muted-foreground">{selectedRequest.requesterName}</p>
                  </div>
                  <div>
                    <span className="font-medium">Requested on:</span>
                    <p className="text-muted-foreground">
                      {new Date(selectedRequest.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  {selectedRequest.dueDate && (
                    <div>
                      <span className="font-medium">Due date:</span>
                      <p className="text-muted-foreground">
                        {new Date(selectedRequest.dueDate).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Approval Flow */}
              <div>
                <h4 className="font-medium mb-4">Approval Flow</h4>
                <div className="space-y-3">
                  {selectedRequest.requiredApprovers.map((level) => (
                    <div key={level.level} className="flex items-center justify-between p-2 border-b">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        level.level < selectedRequest.currentLevel ? 'bg-green-100 text-green-700' :
                        level.level === selectedRequest.currentLevel ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {level.level}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{level.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {level.approverRoles.join(', ')}
                          {level.requiresAll ? ' (All required)' : ' (Any one)'}
                        </p>
                      </div>
                      {level.level < selectedRequest.currentLevel && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {level.level === selectedRequest.currentLevel && (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Actions */}
              {selectedRequest.approvals.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Approval History</h4>
                  <div className="space-y-3">
                    {selectedRequest.approvals.map((approval) => (
                      <div key={approval.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {approval.approverName.split(' ').map(n => n[0] || '').join('')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{approval.approverName}</span>
                            <Badge variant={approval.action === 'approved' ? 'default' : 'destructive'}>
                              {approval.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Level {approval.level} • {new Date(approval.timestamp).toLocaleString()}
                          </p>
                          {approval.comments && (
                            <p className="text-sm mt-1">{approval.comments}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div>
                <h4 className="font-medium mb-4">Comments</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments?.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {comment.userName.split(' ').map(n => n[0] || '').join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comment.userName}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="flex gap-2 mt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addCommentMutation.mutate({
                      requestId: selectedRequest.id,
                      comment: newComment
                    })}
                    disabled={!newComment.trim() || addCommentMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              {canApprove(selectedRequest) && !hasAlreadyApproved(selectedRequest) && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Comments (optional)</label>
                    <Textarea
                      placeholder="Add comments about your decision..."
                      value={actionComments}
                      onChange={(e) => setActionComments(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => processApprovalMutation.mutate({
                        requestId: selectedRequest.id,
                        action: 'approved',
                        comments: actionComments
                      })}
                      disabled={processApprovalMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => processApprovalMutation.mutate({
                        requestId: selectedRequest.id,
                        action: 'rejected',
                        comments: actionComments
                      })}
                      disabled={processApprovalMutation.isPending}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
