// Utility functions for role-based logic

export const corporateUseCases = [
  'corporate-travel',
  'team-retreats', 
  'conferences',
  'sales-trips'
];

export const agencyUseCases = [
  'client-services',
  'client-planning'
];

export function mapUseCaseToRoleType(useCase: string): 'corporate' | 'agency' {
  if (agencyUseCases.includes(useCase)) {
    return 'agency';
  }
  return 'corporate'; // Default to corporate for all other cases including 'other'
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