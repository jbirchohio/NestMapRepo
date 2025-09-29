import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Calendar, MapPin } from 'lucide-react';
import ReuseTemplateDialog from '@/components/ReuseTemplateDialog';
import { useLocation } from 'wouter';

type TemplateItem = {
  id: number;
  title: string;
  price?: string;
  currency?: string;
  duration?: number;
  destinations?: string[];
  cover_image?: string;
  hasPurchased?: boolean;
  isOwner?: boolean;
};

export default function MyTemplatesPanel() {
  const { data: owned, isLoading: loadingOwned } = useQuery({
    queryKey: ['/api/templates/my'],
    queryFn: () => apiRequest('GET', '/api/templates/my')
  });
  const { data: purchased, isLoading: loadingPurchased } = useQuery({
    queryKey: ['/api/templates/purchased'],
    queryFn: () => apiRequest('GET', '/api/templates/purchased')
  });

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const templates: TemplateItem[] = useMemo(() => {
    const own = Array.isArray(owned)
      ? owned.map((t: any) => ({ ...t, isOwner: true }))
      : [];
    const bought = Array.isArray(purchased)
      ? purchased.map((t: any) => ({ ...t, hasPurchased: true }))
      : [];
    // Merge by id to avoid duplicates if a user bought their own (unlikely due to guard)
    const map = new Map<number, TemplateItem>();
    for (const t of [...own, ...bought]) {
      const prev = map.get(t.id);
      map.set(t.id, { ...prev, ...t });
    }
    return Array.from(map.values());
  }, [owned, purchased]);

  const isLoading = loadingOwned || loadingPurchased;

  const onUse = (t: TemplateItem) => {
    setSelectedTemplate(t);
    setOpen(true);
  };

  const onSuccess = (data: any) => {
    setOpen(false);
    setSelectedTemplate(null);
    const tripId = data?.tripId;
    if (tripId) navigate(`/trip/${tripId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your templates...
      </div>
    );
  }

  if (!templates || templates.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">My Templates</h3>
        <div className="text-sm text-gray-500">Created or purchased</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold text-gray-900">{t.title}</div>
                  <div className="text-xs text-gray-600 flex items-center gap-2">
                    {t.duration ? (
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {t.duration} days</span>
                    ) : null}
                    {t.destinations && t.destinations.length > 0 ? (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.destinations.slice(0,2).join(', ')}{t.destinations.length>2?'…':''}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {t.isOwner && <Badge variant="secondary">Owned</Badge>}
                  {t.hasPurchased && <Badge className="bg-purple-100 text-purple-700">Purchased</Badge>}
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" onClick={() => onUse(t)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTemplate && (
        <ReuseTemplateDialog
          template={selectedTemplate}
          isOpen={open}
          onClose={() => setOpen(false)}
          onSuccess={onSuccess}
        />)
      }
    </section>
  );
}

