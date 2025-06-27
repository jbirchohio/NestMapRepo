import SharedFormType from '@/types/SharedFormType';
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Copy, Trash2, FileText, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProposalTemplate {
  id: string;
  name: string;
  description?: string;
  isShared?: boolean;
  branding?: {
    companyName: string;
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    contactInfo?: {
      email: string;
      phone?: string;
      website?: string;
      address?: string;
    };
  };
  sections?: {
    includeCostBreakdown?: boolean;
    includeItinerary?: boolean;
    includeTerms?: boolean;
    includeAboutUs?: boolean;
    customSections?: Array<{
      title: string;
      content: string;
      order: number;
    }>;
  };
  pricingRules?: {
    markup?: number;
    currency?: string;
    discounts?: Array<{
      condition: string;
      percentage: number;
    }>;
  };
  // Timestamps
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const templateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    description: z.string().optional(),
    isShared: z.boolean().default(false),
    branding: z.object({
        companyName: z.string().min(1, "Company name is required"),
        logo: z.string().optional(),
        primaryColor: z.string().default("#2563eb"),
        secondaryColor: z.string().default("#64748b"),
        contactInfo: z.object({
            email: z.string().email("Valid email required"),
            phone: z.string().optional(),
            website: z.string().optional(),
            address: z.string().optional()
        })
    }),
    sections: z.object({
        includeCostBreakdown: z.boolean().default(true),
        includeItinerary: z.boolean().default(true),
        includeTerms: z.boolean().default(true),
        includeAboutUs: z.boolean().default(false),
        customSections: z.array(z.object({
            title: z.string(),
            content: z.string(),
            order: z.number()
        })).default([])
    }),
    pricingRules: z.object({
        markup: z.number().min(0).max(100).default(10),
        discounts: z.array(z.object({
            condition: z.string(),
            percentage: z.number()
        })).default([]),
        currency: z.string().default("USD")
    })
});
type TemplateFormData = z.infer<typeof templateSchema>;
export default function ProposalTemplates() {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const { toast } = useToast();
    const { data: templates, isLoading } = useQuery({
        queryKey: ["/api/proposal-templates"],
    });
    const createTemplate = useMutation({
        mutationFn: (data: TemplateFormData) => apiRequest("POST", "/api/proposal-templates", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/proposal-templates"] });
            setIsCreateDialogOpen(false);
            toast({
                title: "Template Created",
                description: "Your proposal template has been saved successfully.",
            });
        },
    });
    const updateTemplate = useMutation({
        mutationFn: ({ id, data }: {
            id: string | number;
            data: TemplateFormData;
        }) => apiRequest("PUT", `/api/proposal-templates/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/proposal-templates"] });
            setEditingTemplate(null);
            toast({
                title: "Template Updated",
                description: "Your proposal template has been updated successfully.",
            });
        },
    });
    const deleteTemplate = useMutation({
        mutationFn: (id: string | number) => apiRequest('DELETE', `/api/proposal-templates/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/proposal-templates"] });
            toast({
                title: "Template Deleted",
                description: "The proposal template has been deleted.",
            });
        },
    });
    const duplicateTemplate = useMutation({
        mutationFn: (id: string | number) => apiRequest('POST', `/api/proposal-templates/${id}/duplicate`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/proposal-templates"] });
            toast({
                title: "Template Duplicated",
                description: "A copy of the template has been created.",
            });
        },
    });
    const form = useForm<TemplateFormData>({
        resolver: zodResolver(templateSchema),
        defaultValues: {
            name: "",
            description: "",
            isShared: false,
            branding: {
                companyName: "",
                primaryColor: "#2563eb",
                secondaryColor: "#64748b",
                contactInfo: {
                    email: "",
                    phone: "",
                    website: "",
                    address: ""
                }
            },
            sections: {
                includeCostBreakdown: true,
                includeItinerary: true,
                includeTerms: true,
                includeAboutUs: false,
                customSections: []
            },
            pricingRules: {
                markup: 10,
                discounts: [],
                currency: "USD"
            }
        }
    });
    const onSubmit = (data: TemplateFormData) => {
        if (editingTemplate) {
            updateTemplate.mutate({ id: editingTemplate.id, data });
        }
        else {
            createTemplate.mutate(data);
        }
    };
    if (isLoading) {
        return (<div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (<div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>))}
          </div>
        </div>
      </div>);
    }
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Proposal Templates</h1>
          <p className="text-gray-600 dark:text-gray-300">Create reusable templates to speed up proposal generation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2"/>
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Proposal Template</DialogTitle>
              <DialogDescription>
                Set up a reusable template with your branding, sections, and pricing rules.
              </DialogDescription>
            </DialogHeader>
            <TemplateForm form={form} onSubmit={onSubmit} isLoading={createTemplate.isPending}/>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(templates) && templates
          .filter((template): template is ProposalTemplate => 
            template && 
            typeof template === 'object' && 
            'id' in template && 
            'name' in template
          )
          .map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600"/>
                    {template.name}
                  </CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => {
                setEditingTemplate(template);
                form.reset(template);
                setIsCreateDialogOpen(true);
            }}>
                    <Edit className="w-4 h-4"/>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateTemplate.mutate(template.id)}>
                    <Copy className="w-4 h-4"/>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteTemplate.mutate(template.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 className="w-4 h-4"/>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={template.isShared ? "default" : "secondary"}>
                  {template.isShared ? "Team Template" : "Personal"}
                </Badge>
                <Badge variant="outline">
                  {template.pricingRules?.markup || 0}% markup
                </Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p><strong>Company:</strong> {template.branding?.companyName}</p>
                <p><strong>Currency:</strong> {template.pricingRules?.currency}</p>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                {template.sections?.includeCostBreakdown && <span>Cost Breakdown</span>}
                {template.sections?.includeItinerary && <span>Itinerary</span>}
                {template.sections?.includeTerms && <span>Terms</span>}
                {template.sections?.customSections && template.sections.customSections.length > 0 && (
                  <span>+{template.sections.customSections.length} custom</span>
                )}
              </div>
            </CardContent>
          </Card>))}
      </div>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your proposal template settings.
            </DialogDescription>
          </DialogHeader>
          <TemplateForm form={form} onSubmit={onSubmit} isLoading={updateTemplate.isPending} isEditing={true}/>
        </DialogContent>
      </Dialog>
    </div>);
}
function TemplateForm({ form, onSubmit, isLoading, isEditing = false }: {
    form: SharedFormType;
    onSubmit: (data: TemplateFormData) => void;
    isLoading: boolean;
    isEditing?: boolean;
}) {
    const [customSections, setCustomSections] = useState<Array<{
        title: string;
        content: string;
        order: number;
    }>>([]);
    return (<Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Corporate Travel Standard" {...field}/>
                </FormControl>
                <FormMessage />
              </FormItem>)}/>
          <FormField control={form.control} name="description" render={({ field }) => (<FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="Brief description of template" {...field}/>
                </FormControl>
                <FormMessage />
              </FormItem>)}/>
        </div>

        <FormField control={form.control} name="isShared" render={({ field }) => (<FormItem className="flex items-center space-x-2">
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange}/>
              </FormControl>
              <Label>Share with team</Label>
            </FormItem>)}/>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Branding</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="branding.companyName" render={({ field }) => (<FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="branding.contactInfo.email" render={({ field }) => (<FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="branding.primaryColor" render={({ field }) => (<FormItem>
                  <FormLabel>Primary Color</FormLabel>
                  <FormControl>
                    <Input type="color" {...field}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
            <FormField control={form.control} name="pricingRules.markup" render={({ field }) => (<FormItem>
                  <FormLabel>Default Markup (%)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="100" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>)}/>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Sections</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="sections.includeCostBreakdown" render={({ field }) => (<FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                  <Label>Cost Breakdown</Label>
                </FormItem>)}/>
            <FormField control={form.control} name="sections.includeItinerary" render={({ field }) => (<FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                  <Label>Detailed Itinerary</Label>
                </FormItem>)}/>
            <FormField control={form.control} name="sections.includeTerms" render={({ field }) => (<FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                  <Label>Terms & Conditions</Label>
                </FormItem>)}/>
            <FormField control={form.control} name="sections.includeAboutUs" render={({ field }) => (<FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange}/>
                  </FormControl>
                  <Label>About Us Section</Label>
                </FormItem>)}/>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : isEditing ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>);
}
