import { getAnalytics, getOrganizationAnalytics } from "./analytics";

// Analytics now use authentic database data only - all mock data removed
export async function getAuthenticAnalytics(organizationId?: number) {
  if (organizationId) {
    return await getOrganizationAnalytics(organizationId);
  }
  return await getAnalytics();
}

// All demo/mock analytics data has been eliminated
// System now uses only real-time data from the database