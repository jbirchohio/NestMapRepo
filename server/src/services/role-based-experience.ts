import { z } from 'zod';
import { db } from '../db-connection';
import { users, organizations } from '../db/schema';
import { eq, and } from '../utils/drizzle-shim';

// Role-based schemas
const UserRoleSchema = z.enum(['executive', 'travel_manager', 'finance', 'it_admin', 'employee']);

const RoleConfigSchema = z.object({
  role: UserRoleSchema,
  permissions: z.array(z.string()),
  features: z.array(z.string()),
  dashboardConfig: z.object({
    widgets: z.array(z.string()),
    layout: z.string(),
    defaultView: z.string(),
  }),
  preferences: z.object({
    autoApproval: z.boolean().optional(),
    notificationSettings: z.object({
      email: z.boolean(),
      sms: z.boolean(),
      push: z.boolean(),
      slack: z.boolean().optional(),
      teams: z.boolean().optional(),
    }),
    bookingDefaults: z.record(z.any()).optional(),
  }),
});

const PersonalizedExperienceSchema = z.object({
  userId: z.string(),
  role: UserRoleSchema,
  customizations: z.object({
    theme: z.string(),
    language: z.string(),
    timezone: z.string(),
    currency: z.string(),
  }),
  quickActions: z.array(z.string()),
  favoriteDestinations: z.array(z.string()),
  travelPreferences: z.record(z.any()),
});

export class RoleBasedExperience {
  private roleConfigurations: Map<string, z.infer<typeof RoleConfigSchema>> = new Map();

  /**
   * Initialize role-based configurations
   */
  constructor() {
    this.initializeRoleConfigurations();
  }

  /**
   * Executive Travelers Experience
   */
  async getExecutiveExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      const executiveConfig = this.roleConfigurations.get('executive');
      
      return {
        role: 'executive',
        features: {
          oneClickBooking: true,
          vipServices: true,
          executiveLoungeAccess: true,
          prioritySupport: true,
          preApprovedPreferences: true,
          conciergeServices: true,
        },
        dashboard: {
          widgets: [
            'upcoming_trips',
            'travel_summary',
            'cost_overview',
            'team_travel_activity',
            'executive_alerts',
            'vip_services',
          ],
          layout: 'executive',
          defaultView: 'calendar',
        },
        quickActions: [
          'book_preferred_route',
          'extend_trip',
          'upgrade_class',
          'request_concierge',
          'emergency_rebooking',
        ],
        preferences: {
          autoApproval: true,
          bookingDefaults: {
            travelClass: 'business',
            seatPreference: 'aisle',
            hotelCategory: '5-star',
            carCategory: 'luxury',
            mealPreference: 'business',
          },
          notifications: {
            email: true,
            sms: true,
            push: true,
            priorityAlerts: true,
          },
        },
        services: {
          vipLoungeAccess: true,
          priorityBoarding: true,
          conciergeServices: true,
          executiveAssistant: true,
          emergencySupport: '24/7',
        },
      };
    } catch (error) {
      console.error('Executive experience error:', error);
      throw new Error('Failed to get executive experience');
    }
  }

  /**
   * Travel Managers Experience
   */
  async getTravelManagerExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        role: 'travel_manager',
        features: {
          comprehensiveOversight: true,
          bulkBooking: true,
          policyManagement: true,
          vendorNegotiation: true,
          teamManagement: true,
          reportingTools: true,
        },
        dashboard: {
          widgets: [
            'team_travel_overview',
            'budget_tracking',
            'policy_compliance',
            'vendor_performance',
            'approval_queue',
            'cost_analysis',
            'travel_patterns',
            'risk_assessment',
          ],
          layout: 'manager',
          defaultView: 'overview',
        },
        quickActions: [
          'bulk_booking',
          'approve_requests',
          'policy_update',
          'vendor_analysis',
          'budget_adjustment',
          'team_report',
        ],
        tools: {
          bulkBooking: {
            enabled: true,
            maxBookings: 50,
            templates: ['conference', 'training', 'sales_trip'],
          },
          policyManagement: {
            enabled: true,
            canModify: true,
            approvalWorkflow: true,
          },
          vendorNegotiation: {
            enabled: true,
            contractManagement: true,
            performanceTracking: true,
          },
          reporting: {
            customReports: true,
            scheduledReports: true,
            dataExport: true,
            biIntegration: true,
          },
        },
        permissions: [
          'view_all_trips',
          'approve_trips',
          'modify_policies',
          'manage_budgets',
          'vendor_management',
          'team_oversight',
        ],
      };
    } catch (error) {
      console.error('Travel manager experience error:', error);
      throw new Error('Failed to get travel manager experience');
    }
  }

  /**
   * Finance Teams Experience
   */
  async getFinanceExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        role: 'finance',
        features: {
          realTimeSpendTracking: true,
          budgetVarianceAnalysis: true,
          automatedReconciliation: true,
          taxComplianceReporting: true,
          costCenterManagement: true,
          auditTrails: true,
        },
        dashboard: {
          widgets: [
            'spend_tracking',
            'budget_variance',
            'cost_center_analysis',
            'expense_categories',
            'tax_compliance',
            'audit_alerts',
            'reconciliation_status',
            'financial_forecasting',
          ],
          layout: 'finance',
          defaultView: 'spend_analysis',
        },
        quickActions: [
          'budget_adjustment',
          'expense_approval',
          'reconciliation',
          'tax_report',
          'audit_export',
          'variance_analysis',
        ],
        tools: {
          spendTracking: {
            realTime: true,
            budgetAlerts: true,
            varianceThresholds: true,
            costCenterBreakdown: true,
          },
          reconciliation: {
            automated: true,
            bankIntegration: true,
            creditCardIntegration: true,
            expenseMatching: true,
          },
          reporting: {
            financialReports: true,
            taxReports: true,
            auditReports: true,
            complianceReports: true,
            customReports: true,
          },
          budgetManagement: {
            budgetCreation: true,
            budgetApproval: true,
            budgetMonitoring: true,
            forecastingTools: true,
          },
        },
        permissions: [
          'view_all_expenses',
          'approve_expenses',
          'manage_budgets',
          'financial_reporting',
          'audit_access',
          'tax_compliance',
        ],
      };
    } catch (error) {
      console.error('Finance experience error:', error);
      throw new Error('Failed to get finance experience');
    }
  }

  /**
   * IT Administrators Experience
   */
  async getITAdminExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        role: 'it_admin',
        features: {
          securityConfiguration: true,
          userAccessManagement: true,
          integrationMonitoring: true,
          dataGovernance: true,
          systemMonitoring: true,
          complianceManagement: true,
        },
        dashboard: {
          widgets: [
            'system_health',
            'security_alerts',
            'user_activity',
            'integration_status',
            'data_governance',
            'compliance_status',
            'performance_metrics',
            'audit_logs',
          ],
          layout: 'admin',
          defaultView: 'system_overview',
        },
        quickActions: [
          'user_management',
          'security_config',
          'integration_setup',
          'system_backup',
          'audit_export',
          'compliance_check',
        ],
        tools: {
          securityManagement: {
            userRoles: true,
            permissions: true,
            mfaConfiguration: true,
            ssoSetup: true,
            auditLogs: true,
          },
          integrationManagement: {
            apiManagement: true,
            webhookConfiguration: true,
            dataSync: true,
            errorMonitoring: true,
          },
          systemMonitoring: {
            performanceMetrics: true,
            uptimeMonitoring: true,
            errorTracking: true,
            alerting: true,
          },
          dataGovernance: {
            dataRetention: true,
            privacyCompliance: true,
            dataExport: true,
            dataAnonymization: true,
          },
        },
        permissions: [
          'system_administration',
          'user_management',
          'security_configuration',
          'integration_management',
          'data_governance',
          'audit_access',
        ],
      };
    } catch (error) {
      console.error('IT admin experience error:', error);
      throw new Error('Failed to get IT admin experience');
    }
  }

  /**
   * Regular Employee Experience
   */
  async getEmployeeExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        role: 'employee',
        features: {
          selfServiceBooking: true,
          expenseTracking: true,
          travelHistory: true,
          policyGuidance: true,
          mobileApp: true,
          supportChat: true,
        },
        dashboard: {
          widgets: [
            'upcoming_trips',
            'recent_bookings',
            'expense_summary',
            'travel_history',
            'policy_updates',
            'quick_booking',
          ],
          layout: 'employee',
          defaultView: 'my_trips',
        },
        quickActions: [
          'book_trip',
          'modify_booking',
          'submit_expense',
          'view_policy',
          'contact_support',
          'travel_history',
        ],
        tools: {
          booking: {
            selfService: true,
            policyGuidance: true,
            approvalWorkflow: true,
            favoriteRoutes: true,
          },
          expenseManagement: {
            receiptCapture: true,
            expenseSubmission: true,
            mileageTracking: true,
            reimbursementStatus: true,
          },
          travelSupport: {
            chatSupport: true,
            faqAccess: true,
            emergencyContacts: true,
            travelAlerts: true,
          },
        },
        permissions: [
          'book_own_trips',
          'view_own_trips',
          'submit_expenses',
          'view_policies',
          'contact_support',
        ],
      };
    } catch (error) {
      console.error('Employee experience error:', error);
      throw new Error('Failed to get employee experience');
    }
  }

  /**
   * Personalize User Experience
   */
  async personalizeExperience(userId: string, organizationId: string, customizations: any) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Store personalization preferences
      await this.storePersonalizationPreferences(userId, customizations);

      return {
        success: true,
        message: 'Experience personalized successfully',
        customizations,
      };
    } catch (error) {
      console.error('Experience personalization error:', error);
      throw new Error('Failed to personalize experience');
    }
  }

  /**
   * Get User's Personalized Experience
   */
  async getPersonalizedExperience(userId: string, organizationId: string) {
    try {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, userId), eq(users.organizationId, organizationId)),
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get user's role and personalization preferences
      const userRole = await this.getUserRole(userId);
      const personalizations = await this.getPersonalizationPreferences(userId);

      // Get base experience for role
      let baseExperience;
      switch (userRole) {
        case 'executive':
          baseExperience = await this.getExecutiveExperience(userId, organizationId);
          break;
        case 'travel_manager':
          baseExperience = await this.getTravelManagerExperience(userId, organizationId);
          break;
        case 'finance':
          baseExperience = await this.getFinanceExperience(userId, organizationId);
          break;
        case 'it_admin':
          baseExperience = await this.getITAdminExperience(userId, organizationId);
          break;
        default:
          baseExperience = await this.getEmployeeExperience(userId, organizationId);
      }

      // Apply personalizations
      return {
        ...baseExperience,
        personalizations,
        customizations: personalizations.customizations,
      };
    } catch (error) {
      console.error('Personalized experience error:', error);
      throw new Error('Failed to get personalized experience');
    }
  }

  // Helper methods
  private initializeRoleConfigurations() {
    // Initialize default role configurations
    this.roleConfigurations.set('executive', {
      role: 'executive',
      permissions: ['book_any_class', 'exceed_budget', 'emergency_booking', 'vip_services'],
      features: ['one_click_booking', 'vip_services', 'priority_support'],
      dashboardConfig: {
        widgets: ['upcoming_trips', 'travel_summary', 'cost_overview'],
        layout: 'executive',
        defaultView: 'calendar',
      },
      preferences: {
        autoApproval: true,
        notificationSettings: {
          email: true,
          sms: true,
          push: true,
        },
      },
    });

    // Add other role configurations...
  }

  private async getUserRole(userId: string): Promise<z.infer<typeof UserRoleSchema>> {
    // Get user role from database or user profile
    // For now, return default role
    return 'employee';
  }

  private async storePersonalizationPreferences(userId: string, customizations: any) {
    // Store personalization preferences in database
    console.log('Storing personalization preferences:', { userId, customizations });
  }

  private async getPersonalizationPreferences(userId: string) {
    // Get personalization preferences from database
    // For now, return default preferences
    return {
      customizations: {
        theme: 'light',
        language: 'en',
        timezone: 'UTC',
        currency: 'USD',
      },
      quickActions: ['book_trip', 'view_trips', 'submit_expense'],
      favoriteDestinations: [],
      travelPreferences: {},
    };
  }
}

export const roleBasedExperience = new RoleBasedExperience();



