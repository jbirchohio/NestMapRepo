import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Lock, Crown, Building } from "lucide-react";

interface OrganizationPlan {
  id: number;
  name: string;
  plan: string;
  white_label_enabled: boolean;
  white_label_plan: string;
  subscription_status: string;
}

interface WhiteLabelPermissions {
  canAccessWhiteLabel: boolean;
  currentPlan: string;
  limitations: string[];
  upgradeRequired: boolean;
}

export default function WhiteLabelAccessControl({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(false);

  // Check white label permissions
  const { data: permissions, isLoading } = useQuery<WhiteLabelPermissions>({
    queryKey: ['/api/white-label/permissions'],
    retry: false,
  });

  // Check organization plan
  const { data: orgPlan } = useQuery<OrganizationPlan>({
    queryKey: ['/api/organization/plan'],
    retry: false,
  });

  useEffect(() => {
    if (permissions) {
      setHasAccess(permissions.canAccessWhiteLabel);
    }
  }, [permissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess || permissions?.upgradeRequired) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-orange-100 dark:bg-orange-900/20 w-fit">
              <Crown className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-2xl">White Label Access Required</CardTitle>
            <CardDescription>
              Upgrade your plan to access white label customization features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {orgPlan && (
              <Alert>
                <Building className="h-4 w-4" />
                <AlertDescription>
                  Current Plan: <Badge variant="outline" className="ml-2">{orgPlan.plan}</Badge>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">Upgrade to Professional Plan ($99/month):</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Full white label branding (auto-enabled)
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Custom colors, logo, and domain
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Remove "Powered by NestMap"
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Professional client proposals
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-electric-500" />
                  Up to 50 team members
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic White Label</CardTitle>
                  <CardDescription>$29/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Custom logo</li>
                    <li>• Basic color customization</li>
                    <li>• Up to 10 users</li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => {
                    toast({ title: "Contact sales to upgrade your plan" });
                  }}>
                    Upgrade to Basic
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Premium White Label</CardTitle>
                  <CardDescription>$99/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    <li>• Full customization</li>
                    <li>• Custom domain</li>
                    <li>• Up to 50 users</li>
                    <li>• Remove branding</li>
                  </ul>
                  <Button className="w-full mt-4" onClick={() => {
                    toast({ title: "Contact sales to upgrade your plan" });
                  }}>
                    Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            </div>

            {permissions?.limitations && permissions.limitations.length > 0 && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">Current limitations:</span>
                  <ul className="mt-2 space-y-1">
                    {permissions.limitations.map((limitation, index) => (
                      <li key={index} className="text-sm">• {limitation}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
