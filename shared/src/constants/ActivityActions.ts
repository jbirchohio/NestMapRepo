/**
 * Constants for activity actions used throughout the application
 */

export const ACTIVITY_ACTIONS = {
  EDITED: 'edited',
  JOINED: 'joined',
  LEFT: 'left',
  UPDATED: 'updated',
  VIEWED: 'viewed',
  EDITING: 'editing',
  VIEWING: 'viewing',
  ADDED: 'added',
  DELETED: 'deleted',
  PAGE_VIEW: 'page_view',
  EDITING_SECTION: 'editing_section',
  VIEWING_SECTION: 'viewing_section',
  LEFT_SECTION: 'left_section',
} as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];
