import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  BarChart3, 
  LineChart, 
  PieChart, 
  Save, 
  Plus,
  Trash2,
  Filter,
  Eye
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  source: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between';
  value: any;
}

interface ReportDefinition {
  id?: string;
  name: string;
  description: string;
  type: 'table' | 'chart';
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  fields: ReportField[];
  filters: ReportFilter[];
  groupBy: string[];
  orderBy: { field: string; direction: 'asc' | 'desc' }[];
  schedule?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
  visualization: {
    showGrid: boolean;
    showLegend: boolean;
    colorScheme: string;
    title: string;
    subtitle: string;
  };
}

const AVAILABLE_FIELDS: ReportField[] = [
  { id: 'trip_id', name: 'Trip ID', type: 'string', source: 'trips' },
  { id: 'trip_name', name: 'Trip Name', type: 'string', source: 'trips' },
  { id: 'destination', name: 'Destination', type: 'string', source: 'trips' },
  { id: 'start_date', name: 'Start Date', type: 'date', source: 'trips' },
  { id: 'end_date', name: 'End Date', type: 'date', source: 'trips' },
  { id: 'budget', name: 'Budget', type: 'number', source: 'trips', aggregation: 'sum' },
  { id: 'actual_cost', name: 'Actual Cost', type: 'number', source: 'trips', aggregation: 'sum' },
  { id: 'traveler_count', name: 'Traveler Count', type: 'number', source: 'trips', aggregation: 'count' },
  { id: 'expense_amount', name: 'Expense Amount', type: 'number', source: 'expenses', aggregation: 'sum' },
  { id: 'expense_category', name: 'Expense Category', type: 'string', source: 'expenses' },
  { id: 'expense_date', name: 'Expense Date', type: 'date', source: 'expenses' },
  { id: 'carbon_emissions', name: 'Carbon Emissions', type: 'number', source: 'trips', aggregation: 'sum' },
  { id: 'user_name', name: 'User Name', type: 'string', source: 'users' },
  { id: 'department', name: 'Department', type: 'string', source: 'users' }
];

const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'line', label: 'Line Chart', icon: LineChart },
  { value: 'pie', label: 'Pie Chart', icon: PieChart },
  { value: 'area', label: 'Area Chart', icon: BarChart3 },
  { value: 'scatter', label: 'Scatter Plot', icon: BarChart3 }
];

export default function CustomReportBuilder() {
  const { toast } = useToast();
  const [reportDefinition, setReportDefinition] = useState<ReportDefinition>({
    name: '',
    description: '',
    type: 'table',
    fields: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    visualization: {
      showGrid: true,
      showLegend: true,
      colorScheme: 'default',
      title: '',
      subtitle: ''
    }
  });
  const [selectedTab, setSelectedTab] = useState('fields');
  const [previewData, setPreviewData] = useState<{ rows?: any[] } | null>(null);

  // Fetch existing reports
  const { } = useQuery({
    queryKey: ['/api/custom-reporting/definitions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/custom-reporting/definitions');
      return response.data;
    }
  });

  // Save report mutation
  const saveReportMutation = useMutation({
    mutationFn: async (definition: ReportDefinition) => {
      const endpoint = definition.id 
        ? `/api/custom-reporting/definitions/${definition.id}`
        : '/api/custom-reporting/definitions';
      const method = definition.id ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, endpoint, definition);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/custom-reporting/definitions'] });
      toast({
        title: "Report Saved",
        description: "Report definition has been saved successfully."
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save report definition.",
        variant: "destructive"
      });
    }
  });

  // Generate preview mutation
  const generatePreviewMutation = useMutation({
    mutationFn: async (definition: ReportDefinition) => {
      const response = await apiRequest('POST', '/api/custom-reporting/preview', definition);
      return response.data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setSelectedTab('preview');
    },
    onError: () => {
      toast({
        title: "Preview Failed",
        description: "Failed to generate report preview.",
        variant: "destructive"
      });
    }
  });

  const handleDragEnd = useCallback((result: { 
    destination: { droppableId: string; index: number } | null; 
    source: { droppableId: string; index: number }; 
    draggableId: string;
  }) => {
    if (!result.destination) return;

    const { source, destination } = result;
    
    if (source.droppableId === 'available-fields' && destination.droppableId === 'selected-fields') {
      const field = AVAILABLE_FIELDS.find(f => f.id === result.draggableId);
      if (field && !reportDefinition.fields.find(f => f.id === field.id)) {
        setReportDefinition(prev => ({
          ...prev,
          fields: [...prev.fields, field]
        }));
      }
    } else if (source.droppableId === 'selected-fields' && destination.droppableId === 'available-fields') {
      setReportDefinition(prev => ({
        ...prev,
        fields: prev.fields.filter(f => f.id !== result.draggableId)
      }));
    }
  }, []);

  const addFilter = useCallback((): void => {
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: ''
    };
    setReportDefinition(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  }, []);

  const updateFilter = useCallback((filterId: string, updates: Partial<ReportFilter>) => {
    setReportDefinition(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === filterId ? { ...f, ...updates } : f)
    }));
  }, [reportDefinition]);

  const removeFilter = useCallback((filterId: string) => {
    setReportDefinition(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  }, []);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Custom Report Builder</h2>
          <p className="text-muted-foreground">
            Create custom reports with drag-and-drop interface
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generatePreviewMutation.mutate(reportDefinition)}
            disabled={reportDefinition.fields.length === 0 || generatePreviewMutation.isPending}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={() => saveReportMutation.mutate(reportDefinition)}
            disabled={!reportDefinition.name || reportDefinition.fields.length === 0 || saveReportMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="fields">Fields</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
          <TabsTrigger value="visualization">Visualization</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name</Label>
              <Input
                id="report-name"
                value={reportDefinition.name}
                onChange={(e) => setReportDefinition(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter report name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select
                value={reportDefinition.type}
                onValueChange={(value: 'table' | 'chart') => 
                  setReportDefinition(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="table">Table</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={reportDefinition.description}
              onChange={(e) => setReportDefinition(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this report shows"
            />
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="available-fields">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[200px]"
                      >
                        {AVAILABLE_FIELDS.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 border rounded-lg cursor-move ${
                                  snapshot.isDragging ? 'bg-muted' : 'bg-background'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{field.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {field.type} • {field.source}
                                    </p>
                                  </div>
                                  {field.aggregation && (
                                    <Badge variant="outline">{field.aggregation}</Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selected Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <Droppable droppableId="selected-fields">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-2 min-h-[200px]"
                      >
                        {reportDefinition.fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3 border rounded-lg cursor-move ${
                                  snapshot.isDragging ? 'bg-muted' : 'bg-background'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">{field.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {field.type} • {field.source}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReportDefinition(prev => ({
                                      ...prev,
                                      fields: prev.fields.filter(f => f.id !== field.id)
                                    }))}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {reportDefinition.fields.length === 0 && (
                          <div className="text-center text-muted-foreground py-8">
                            <p>Drag fields here to build your report</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </CardContent>
              </Card>
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Report Filters</h3>
            <Button onClick={addFilter}>
              <Plus className="h-4 w-4 mr-2" />
              Add Filter
            </Button>
          </div>

          <div className="space-y-4">
            {reportDefinition.filters.map((filter) => (
              <Card key={filter.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Field</Label>
                      <Select
                        value={filter.field}
                        onValueChange={(value) => updateFilter(filter.id, { field: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FIELDS.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Operator</Label>
                      <Select
                        value={filter.operator}
                        onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Enter value"
                      />
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => removeFilter(filter.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {reportDefinition.filters.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No filters added yet. Click "Add Filter" to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="visualization" className="space-y-6">
          {reportDefinition.type === 'chart' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chart Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {CHART_TYPES.map((chartType) => (
                    <Button
                      key={chartType.value}
                      variant={reportDefinition.chartType === chartType.value ? "default" : "outline"}
                      onClick={() => setReportDefinition(prev => ({ ...prev, chartType: chartType.value as any }))}
                      className="h-16 flex-col"
                    >
                      <chartType.icon className="h-6 w-6 mb-1" />
                      <span className="text-xs">{chartType.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="chart-title">Chart Title</Label>
              <Input
                id="chart-title"
                value={reportDefinition.visualization.title}
                onChange={(e) => setReportDefinition(prev => ({
                  ...prev,
                  visualization: { ...prev.visualization, title: e.target.value }
                }))}
                placeholder="Enter chart title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chart-subtitle">Subtitle</Label>
              <Input
                id="chart-subtitle"
                value={reportDefinition.visualization.subtitle}
                onChange={(e) => setReportDefinition(prev => ({
                  ...prev,
                  visualization: { ...prev.visualization, subtitle: e.target.value }
                }))}
                placeholder="Enter subtitle"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Grid Lines</Label>
                <p className="text-sm text-muted-foreground">Display grid lines on charts</p>
              </div>
              <Switch
                checked={reportDefinition.visualization.showGrid}
                onCheckedChange={(checked) => setReportDefinition(prev => ({
                  ...prev,
                  visualization: { ...prev.visualization, showGrid: checked }
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Legend</Label>
                <p className="text-sm text-muted-foreground">Display chart legend</p>
              </div>
              <Switch
                checked={reportDefinition.visualization.showLegend}
                onCheckedChange={(checked) => setReportDefinition(prev => ({
                  ...prev,
                  visualization: { ...prev.visualization, showLegend: checked }
                }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Scheduled Reports</Label>
              <p className="text-sm text-muted-foreground">Automatically generate and send reports</p>
            </div>
            <Switch
              checked={reportDefinition.schedule?.enabled || false}
              onCheckedChange={(checked) => setReportDefinition(prev => ({
                ...prev,
                schedule: { ...prev.schedule, enabled: checked, frequency: 'weekly', recipients: [] }
              }))}
            />
          </div>

          {reportDefinition.schedule?.enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={reportDefinition.schedule.frequency}
                  onValueChange={(value: any) => setReportDefinition(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule!, frequency: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recipients</Label>
                <Textarea
                  value={reportDefinition.schedule?.recipients?.join(', ') || ''}
                  onChange={(e) => setReportDefinition(prev => ({
                    ...prev,
                    schedule: { 
                      ...prev.schedule!, 
                      recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    }
                  }))}
                  placeholder="Enter email addresses separated by commas"
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          {generatePreviewMutation.isPending ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Generating preview...</p>
              </div>
            </div>
          ) : previewData ? (
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {previewData.rows?.length || 0} rows
                  </div>
                  {/* Preview content would be rendered here based on previewData */}
                  <div className="border rounded-lg p-4">
                    {previewData.rows && previewData.rows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(previewData.rows[0]).map((key) => (
                                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.rows.map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {Object.values(row).map((value, colIndex) => (
                                  <td key={`${rowIndex}-${colIndex}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">
                        No preview data available
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click "Preview" to see your report</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
