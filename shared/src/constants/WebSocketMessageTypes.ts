/**
 * Constants for WebSocket message types used in real-time collaboration
 */

export const WS_MESSAGE_TYPES = {
  PRESENCE_UPDATE: 'presence_update',
  COLLABORATORS_LIST: 'collaborators_list',
  COLLABORATOR_JOINED: 'collaborator_joined',
  COLLABORATOR_LEFT: 'collaborator_left',
  COLLABORATOR_UPDATED: 'collaborator_updated',
  CURSOR_UPDATE: 'cursor_update',
  ACTIVITY_UPDATE: 'activity_update',
  SECTION_UPDATED: 'section_updated',
} as const;

export type WSMessageType = typeof WS_MESSAGE_TYPES[keyof typeof WS_MESSAGE_TYPES];

export default WS_MESSAGE_TYPES;
