// Re-export types from shared location
// This file is maintained for backward compatibility
// New code should import directly from '@shared/schema/types/activity/index'

export {
  type ClientActivity,
  type ActivityFormValues,
  type ActivityModalProps,
  activityFormSchema as activitySchema,
  isActivity,
  isClientActivity,
  ActivityStatus
} from '@shared/schema/types/activity/index';