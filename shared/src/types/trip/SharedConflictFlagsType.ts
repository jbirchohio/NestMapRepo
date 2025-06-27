/**
 * Type definition for shared conflict flags in trip optimization
 * Used to track and resolve scheduling conflicts
 */

export interface SharedConflictFlagsType {
  hasDateConflict: boolean;
  hasLocationConflict: boolean;
  hasBudgetConflict: boolean;
  hasAttendeeConflict: boolean;
  conflictMessages: string[];
  // Add any additional conflict-related fields needed
}

export default SharedConflictFlagsType;
