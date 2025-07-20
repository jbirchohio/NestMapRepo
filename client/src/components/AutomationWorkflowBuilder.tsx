import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Play, 
  Settings,
  GitBranch,
  Clock,
  Mail,
  MessageSquare,
  FileText,
  Database,
  Webhook
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface WorkflowTrigger {
  id: string;
  type: 'schedule' | 'event' | 'webhook' | 'manual';
  config: Record<string, any>;
  name: string;
}

interface WorkflowAction {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'api_call' | 'database' | 'approval' | 'delay';
  config: Record<string, any>;
  name: string;
  position: { x: number; y: number };
}

interface WorkflowCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
  trueAction: string;
  falseAction: string;
}

interface Workflow {
  id?: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
  status: 'active' | 'inactive' | 'draft';
  lastRun?: string;
  runCount: number;
  successRate: number;
}

const TRIGGER_TYPES = [
  { value: 'schedule', label: 'Schedule', icon: Clock },
  { value: 'event', label: 'Event', icon: Zap },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'manual', label: 'Manual', icon: Play }
];

const ACTION_TYPES = [
  { value: 'email', label: 'Send Email', icon: Mail },
  { value: 'sms', label: 'Send SMS', icon: MessageSquare },
  { value: 'slack', label: 'Slack Message', icon: MessageSquare },
  { value: 'api_call', label: 'API Call', icon: Database },
  { value: 'approval', label: 'Request Approval', icon: FileText },
  { value: 'delay', label: 'Delay', icon: Clock }
];

export default function AutomationWorkflowBuilder() {
  const { toast } = useToast();
  const [workflow, setWorkflow] = useState<Workflow>({
    name: '',
    description: '',
    trigger: { id: '', type: 'manual', config: {}, name: '' },
    actions: [],
    conditions: [],
    status: 'draft',
    runCount: 0,
    successRate: 0
  });
  const [selectedTab, setSelectedTab] = useState('builder');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const { data: workflows } = useQuery({
    queryKey: ['/api/automation/workflows'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/automation/workflows');
      return response.data;
    }
  });

  const { data: templates } = useQuery({
    queryKey: ['/api/automation/templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/automation/templates');
      return response.data;
    }
  });

  const saveWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Workflow) => {
      const endpoint = workflowData.id 
        ? `/api/automation/workflows/${workflowData.id}`
        : '/api/automation/workflows';
      const method = workflowData.id ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, endpoint, workflowData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/automation/workflows'] });
      toast({
        title: "Workflow Saved",
        description: "Automation workflow has been saved successfully."
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow.",
        variant: "destructive"
      });
    }
  });

  const runWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await apiRequest('POST', `/api/automation/workflows/${workflowId}/run`);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Workflow Started",
        description: "Automation workflow is now running."
      });
    }
  });

  const addAction = (type: string) => {
    const newAction: WorkflowAction = {
      id: `action_${Date.now()}`,
      type: type as any,
      config: {},
      name: `${type.replace('_', ' ')} Action`,
      position: { x: 100, y: workflow.actions.length * 100 + 100 }
    };
    
    setWorkflow(prev => ({
      ...prev,
      actions: [...prev.actions, newAction]
    }));
  };

  const updateAction = (actionId: string, updates: Partial<WorkflowAction>) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.map(action => 
        action.id === actionId ? { ...action, ...updates } : action
      )
    }));
  };

  const removeAction = (actionId: string) => {
    setWorkflow(prev => ({
      ...prev,
      actions: prev.actions.filter(action => action.id !== actionId)
    }));
  };

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination) return;

    const items = Array.from(workflow.actions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWorkflow(prev => ({ ...prev, actions: items }));
  }, [workflow.actions]);

  const renderActionConfig = (action: WorkflowAction) => {
    switch (action.type) {
      case 'email':
        return (
          <div className="space-y-3">
            <div>
              <Label>Recipients</Label>
              <Input
                value={action.config.recipients || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, recipients: e.target.value }
                })}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={action.config.subject || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, subject: e.target.value }
                })}
                placeholder="Email subject"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={action.config.message || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, message: e.target.value }
                })}
                placeholder="Email message content"
              />
            </div>
          </div>
        );
      
      case 'api_call':
        return (
          <div className="space-y-3">
            <div>
              <Label>URL</Label>
              <Input
                value={action.config.url || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, url: e.target.value }
                })}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={action.config.method || 'GET'}
                onValueChange={(value) => updateAction(action.id, {
                  config: { ...action.config, method: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Headers</Label>
              <Textarea
                value={action.config.headers || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, headers: e.target.value }
                })}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
              />
            </div>
          </div>
        );
      
      case 'delay':
        return (
          <div className="space-y-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={action.config.duration || ''}
                onChange={(e) => updateAction(action.id, {
                  config: { ...action.config, duration: parseInt(e.target.value) }
                })}
                placeholder="30"
              />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-sm text-muted-foreground">
            Configuration options will appear here based on the action type.
          </div>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automation Workflow Builder</h2>
          <p className="text-muted-foreground">
            Create and manage automated workflows for your travel processes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => runWorkflowMutation.mutate(workflow.id!)}
            disabled={!workflow.id || runWorkflowMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Test Run
          </Button>
          <Button
            onClick={() => saveWorkflowMutation.mutate(workflow)}
            disabled={!workflow.name || saveWorkflowMutation.isPending}
          >
            <Zap className="h-4 w-4 mr-2" />
            Save Workflow
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
          <TabsTrigger value="workflows">My Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input
                      id="workflow-name"
                      value={workflow.name}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter workflow name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workflow-description">Description</Label>
                    <Textarea
                      id="workflow-description"
                      value={workflow.description}
                      onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-sm text-muted-foreground">Enable this workflow</p>
                    </div>
                    <Switch
                      checked={workflow.status === 'active'}
                      onCheckedChange={(checked) => setWorkflow(prev => ({
                        ...prev,
                        status: checked ? 'active' : 'inactive'
                      }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trigger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Trigger Type</Label>
                    <Select
                      value={workflow.trigger.type}
                      onValueChange={(value: any) => setWorkflow(prev => ({
                        ...prev,
                        trigger: { ...prev.trigger, type: value }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((trigger) => (
                          <SelectItem key={trigger.value} value={trigger.value}>
                            {trigger.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {workflow.trigger.type === 'schedule' && (
                    <div>
                      <Label>Schedule</Label>
                      <Input
                        value={workflow.trigger.config.schedule || ''}
                        onChange={(e) => setWorkflow(prev => ({
                          ...prev,
                          trigger: {
                            ...prev.trigger,
                            config: { ...prev.trigger.config, schedule: e.target.value }
                          }
                        }))}
                        placeholder="0 9 * * 1-5 (Every weekday at 9 AM)"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Actions</CardTitle>
                    <div className="flex gap-2">
                      {ACTION_TYPES.map((actionType) => (
                        <Button
                          key={actionType.value}
                          variant="outline"
                          size="sm"
                          onClick={() => addAction(actionType.value)}
                        >
                          <actionType.icon className="h-4 w-4 mr-1" />
                          {actionType.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="actions">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {workflow.actions.map((action, index) => (
                            <Draggable key={action.id} draggableId={action.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 border rounded-lg ${
                                    snapshot.isDragging ? 'bg-muted' : 'bg-background'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const ActionIcon = ACTION_TYPES.find(t => t.value === action.type)?.icon;
                                        return ActionIcon ? <ActionIcon className="h-4 w-4" /> : null;
                                      })()}
                                      <span className="font-medium">{action.name}</span>
                                      <Badge variant="outline" className="capitalize">
                                        {action.type.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedAction(
                                          selectedAction === action.id ? null : action.id
                                        )}
                                      >
                                        <Settings className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeAction(action.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {selectedAction === action.id && (
                                    <div className="border-t pt-3">
                                      {renderActionConfig(action)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {workflow.actions.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No actions added yet. Click an action type above to get started.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">
                        Trigger: {workflow.trigger.type || 'Not set'}
                      </span>
                    </div>
                    
                    {workflow.actions.map((action, index) => (
                      <div key={action.id} className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">
                          {index + 1}. {action.name}
                        </span>
                      </div>
                    ))}
                    
                    {workflow.actions.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No actions configured
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <GitBranch className="h-4 w-4 mr-2" />
                    Add Branch
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Add Delay
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows?.map((wf: Workflow) => (
              <Card key={wf.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{wf.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{wf.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={wf.status === 'active' ? 'default' : 'secondary'}>
                        {wf.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setWorkflow(wf)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">Trigger</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {wf.trigger.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Actions</p>
                      <p className="text-sm text-muted-foreground">
                        {wf.actions.length} configured
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Runs</p>
                      <p className="text-sm text-muted-foreground">
                        {wf.runCount} total
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Success Rate</p>
                      <p className="text-sm text-muted-foreground">
                        {wf.successRate}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates?.map((template: any) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {template.tags?.map((tag: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWorkflow({ ...template, id: undefined })}
                      className="w-full"
                    >
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{workflows?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {workflows?.filter((w: Workflow) => w.status === 'active').length || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows?.reduce((sum: number, w: Workflow) => sum + w.runCount, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {workflows?.length ? 
                    Math.round(workflows.reduce((sum: number, w: Workflow) => sum + w.successRate, 0) / workflows.length) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across all workflows
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">247h</div>
                <p className="text-xs text-muted-foreground">
                  Estimated this month
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
