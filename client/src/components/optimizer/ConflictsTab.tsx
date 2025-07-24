// Conflicts tab component
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export interface Conflict {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestedFix: string;
  autoFixAvailable?: boolean;
  activities: any[];
}

interface ConflictsTabProps {
  conflicts: Conflict[];
  onAutoFix: (conflictIds: string[]) => void;
  isFixing: boolean;
}

export function ConflictsTab({ conflicts, onAutoFix, isFixing }: ConflictsTabProps) {
  if (conflicts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
        <div className="text-lg font-medium">No conflicts detected!</div>
        <div className="text-gray-600 dark:text-gray-300">Your schedule is perfectly optimized.</div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'medium': return 'text-yellow-700 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  const autoFixableConflicts = conflicts.filter(c => c.autoFixAvailable);

  return (
    <div className="space-y-4">
      {autoFixableConflicts.length > 0 && (
        <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
          <div>
            <div className="font-medium">Auto-fix Available</div>
            <div className="text-sm text-muted-foreground">
              {autoFixableConflicts.length} conflicts can be automatically resolved
            </div>
          </div>
          <Button
            onClick={() => onAutoFix(autoFixableConflicts.map(c => c.id))}
            disabled={isFixing}
            className="flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {isFixing ? 'Fixing...' : 'Auto-Fix All'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <Alert key={index} className={getSeverityColor(conflict.severity)}>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium">{conflict.description}</div>
                  <div className="text-sm mt-1 opacity-75">{conflict.suggestedFix}</div>
                  <div className="flex gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {conflict.type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {conflict.severity} priority
                    </Badge>
                  </div>
                </div>
                {conflict.autoFixAvailable && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAutoFix([conflict.id])}
                    disabled={isFixing}
                  >
                    Fix
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  );
}
