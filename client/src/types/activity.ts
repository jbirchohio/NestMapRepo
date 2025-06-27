// Re-export types from shared location
// This file is maintained for backward compatibility
// New code should import directly from '@shared/types/activity'

export {
  type ClientActivity,
  type ActivityFormValues,
  type ActivityModalProps,
  activityFormSchema as activitySchema,
  isActivity,
  isClientActivity
} from '@shared/types/activity';

// Note: The following types are kept for backward compatibility
// but should be considered deprecated. Use the ones from @shared/types/activity instead
export type { ActivityFormValues };

/**
 * @deprecated Use ActivityFormValues from '@shared/types/activity' instead
 */
export interface ActivityModalProps {
  tripId: string;
  date: Date;
  activity?: ClientActivity;
  onClose: () => void;
  onSave: () => void;
}
