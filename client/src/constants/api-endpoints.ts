/**
 * API endpoint definitions
 * 
 * This file contains all API endpoint paths used in the application.
 * Keep them organized by feature/resource and use consistent naming.
 */

const API_PREFIX = '/api/v1';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_PREFIX}/auth/login`,
    LOGOUT: `${API_PREFIX}/auth/logout`,
    REFRESH: `${API_PREFIX}/auth/refresh`,
    ME: `${API_PREFIX}/auth/me`,
  },
  
  // User endpoints
  USERS: {
    BASE: `${API_PREFIX}/users`,
    byId: (id: string) => `${API_PREFIX}/users/${id}`,
    PROFILE: `${API_PREFIX}/users/profile`,
    PASSWORD: `${API_PREFIX}/users/password`,
  },
  
  // Organization endpoints
  ORGANIZATIONS: {
    BASE: `${API_PREFIX}/organizations`,
    byId: (id: string) => `${API_PREFIX}/organizations/${id}`,
    MEMBERS: (orgId: string) => `${API_PREFIX}/organizations/${orgId}/members`,
    INVITATIONS: (orgId: string) => `${API_PREFIX}/organizations/${orgId}/invitations`,
  },
  
  // Billing endpoints
  BILLING: {
    SUBSCRIPTIONS: `${API_PREFIX}/billing/subscriptions`,
    INVOICES: `${API_PREFIX}/billing/invoices`,
    PAYMENT_METHODS: `${API_PREFIX}/billing/payment-methods`,
    PLANS: `${API_PREFIX}/billing/plans`,
  },
  
  // Trip endpoints
  TRIPS: {
    BASE: `${API_PREFIX}/trips`,
    byId: (id: string) => `${API_PREFIX}/trips/${id}`,
    ITINERARY: (tripId: string) => `${API_PREFIX}/trips/${tripId}/itinerary`,
    EXPENSES: (tripId: string) => `${API_PREFIX}/trips/${tripId}/expenses`,
  },
  
  // Shared endpoints
  SHARED: {
    UPLOAD: `${API_PREFIX}/shared/upload`,
    EXPORT: `${API_PREFIX}/shared/export`,
  },
} as const;

export type ApiEndpoints = typeof API_ENDPOINTS;
