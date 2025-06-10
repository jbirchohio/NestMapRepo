// Enhanced utility functions for role-based logic with granular use cases

export const corporateUseCases = [
  'corporate-travel-management',
  'employee-business-trips',
  'team-retreats-offsite',
  'conference-event-attendance',
  'sales-client-meetings',
  'training-workshops',
  'site-visits-inspections',
  'company-relocations',
  'executive-travel'
];

export const agencyUseCases = [
  'travel-agency-operations',
  'client-trip-planning',
  'destination-management',
  'group-travel-coordination',
  'luxury-travel-services',
  'corporate-client-services',
  'event-travel-planning',
  'leisure-travel-booking'
];

export const useCaseDisplayNames = {
  // Corporate use cases
  'corporate-travel-management': 'Corporate Travel Management',
  'employee-business-trips': 'Employee Business Trips',
  'team-retreats-offsite': 'Team Retreats & Offsites',
  'conference-event-attendance': 'Conference & Event Attendance',
  'sales-client-meetings': 'Sales & Client Meetings',
  'training-workshops': 'Training & Workshops',
  'site-visits-inspections': 'Site Visits & Inspections',
  'company-relocations': 'Company Relocations',
  'executive-travel': 'Executive Travel',
  
  // Agency use cases
  'travel-agency-operations': 'Travel Agency Operations',
  'client-trip-planning': 'Client Trip Planning & Booking',
  'destination-management': 'Destination Management Services',
  'group-travel-coordination': 'Group Travel Coordination',
  'luxury-travel-services': 'Luxury Travel Services',
  'corporate-client-services': 'Corporate Client Services',
  'event-travel-planning': 'Event & Conference Travel',
  'leisure-travel-booking': 'Leisure Travel Booking'
};

export function mapUseCaseToRoleType(useCase: string): 'corporate' | 'agency' {
  if (agencyUseCases.includes(useCase)) {
    return 'agency';
  }
  return 'corporate'; // Default to corporate for all corporate use cases and unknown cases
}

export function getRoleDisplayName(roleType: 'corporate' | 'agency'): string {
  return roleType === 'agency' ? 'Travel Agency' : 'Corporate Travel';
}

export function getRoleDashboardPath(roleType: 'corporate' | 'agency'): string {
  return roleType === 'agency' ? '/dashboard/agency' : '/dashboard/corporate';
}

export function getRoleDescription(roleType: 'corporate' | 'agency'): string {
  return roleType === 'agency' 
    ? 'Focus on creating client proposals and managing travel agency services'
    : 'Focus on internal company travel management and team coordination';
}
