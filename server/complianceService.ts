import { Router } from 'express';
import { db } from './db-connection';
import { users, trips, activities } from '../shared/src/schema';
import { eq, and, or, inArray, gte, lte } from 'drizzle-orm';
import { auditLogger } from './auditLogger';
import crypto from 'crypto';

export interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  region: string;
  requirements: ComplianceRequirement[];
  isActive: boolean;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  type: 'data_retention' | 'consent' | 'access_rights' | 'deletion_rights' | 'portability' | 'notification';
  severity: 'mandatory' | 'recommended' | 'optional';
  implementation: RequirementImplementation;
}

export interface RequirementImplementation {
  automated: boolean;
  checkFunction?: string;
  remediation?: string;
  documentation?: string;
}

export interface DataSubject {
  id: string;
  userId: number;
  email: string;
  name: string;
  region: string;
  consentRecords: ConsentRecord[];
  dataProcessingActivities: DataProcessingActivity[];
  rightsRequests: DataSubjectRightsRequest[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  consentGiven: boolean;
  consentDate: Date;
  consentMethod: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
  consentVersion: string;
  withdrawalDate?: Date;
  withdrawalMethod?: string;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface DataProcessingActivity {
  id: string;
  dataSubjectId: string;
  activity: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  recipients: string[];
  retentionPeriod: number; // in days
  isAutomatedDecisionMaking: boolean;
  crossBorderTransfer: boolean;
  transferSafeguards?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface DataSubjectRightsRequest {
  id: string;
  dataSubjectId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  rejectionReason?: string;
  requestDetails: string;
  responseData?: any;
  verificationMethod: string;
  isVerified: boolean;
  processingNotes?: string;
}

export interface ComplianceReport {
  id: string;
  organizationId: number;
  reportType: 'gdpr' | 'ccpa' | 'pipeda' | 'lgpd' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: ComplianceMetrics;
  violations: ComplianceViolation[];
  recommendations: string[];
  generatedAt: Date;
  generatedBy: number;
}

export interface ComplianceMetrics {
  totalDataSubjects: number;
  activeConsents: number;
  withdrawnConsents: number;
  rightsRequests: {
    total: number;
    byType: Record<string, number>;
    averageResponseTime: number;
    completionRate: number;
  };
  dataBreaches: number;
  retentionViolations: number;
  crossBorderTransfers: number;
}

export interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedDataSubjects: number;
  detectedAt: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  remediation?: string;
  resolvedAt?: Date;
}

export class ComplianceService {
  private static instance: ComplianceService;
  private frameworks: Map<string, ComplianceFramework> = new Map();
  private dataSubjects: Map<number, DataSubject> = new Map();
  private rightsRequests: Map<string, DataSubjectRightsRequest> = new Map();

  static getInstance(): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService();
    }
    return ComplianceService.instance;
  }

  async initializeFrameworks(): Promise<void> {
    // GDPR Framework
    const gdprFramework: ComplianceFramework = {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      description: 'EU data protection regulation',
      region: 'EU',
      requirements: [
        {
          id: 'gdpr-consent',
          name: 'Lawful Basis for Processing',
          description: 'Must have valid legal basis for processing personal data',
          type: 'consent',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'checkConsentRecords',
            remediation: 'Obtain valid consent or establish alternative legal basis'
          }
        },
        {
          id: 'gdpr-retention',
          name: 'Data Retention Limits',
          description: 'Personal data must not be kept longer than necessary',
          type: 'data_retention',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'checkRetentionPeriods',
            remediation: 'Delete or anonymize data that exceeds retention period'
          }
        },
        {
          id: 'gdpr-access',
          name: 'Right of Access',
          description: 'Data subjects have right to access their personal data',
          type: 'access_rights',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'processAccessRequest',
            remediation: 'Provide data subject with copy of their personal data'
          }
        },
        {
          id: 'gdpr-erasure',
          name: 'Right to Erasure',
          description: 'Data subjects have right to request deletion of their data',
          type: 'deletion_rights',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'processErasureRequest',
            remediation: 'Delete personal data unless legal grounds for retention exist'
          }
        },
        {
          id: 'gdpr-portability',
          name: 'Right to Data Portability',
          description: 'Data subjects have right to receive their data in structured format',
          type: 'portability',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'processPortabilityRequest',
            remediation: 'Provide data in machine-readable format'
          }
        },
        {
          id: 'gdpr-breach-notification',
          name: 'Data Breach Notification',
          description: 'Must notify authorities within 72 hours of data breach',
          type: 'notification',
          severity: 'mandatory',
          implementation: {
            automated: false,
            remediation: 'Notify supervisory authority and affected individuals'
          }
        }
      ],
      isActive: true
    };

    // CCPA Framework
    const ccpaFramework: ComplianceFramework = {
      id: 'ccpa',
      name: 'California Consumer Privacy Act',
      description: 'California state privacy law',
      region: 'CA-US',
      requirements: [
        {
          id: 'ccpa-disclosure',
          name: 'Right to Know',
          description: 'Consumers have right to know what personal information is collected',
          type: 'access_rights',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'processAccessRequest',
            remediation: 'Provide consumer with information about data collection'
          }
        },
        {
          id: 'ccpa-deletion',
          name: 'Right to Delete',
          description: 'Consumers have right to request deletion of personal information',
          type: 'deletion_rights',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'processErasureRequest',
            remediation: 'Delete personal information unless exception applies'
          }
        },
        {
          id: 'ccpa-opt-out',
          name: 'Right to Opt-Out',
          description: 'Consumers have right to opt out of sale of personal information',
          type: 'consent',
          severity: 'mandatory',
          implementation: {
            automated: true,
            checkFunction: 'checkOptOutRequests',
            remediation: 'Stop selling personal information'
          }
        }
      ],
      isActive: true
    };

    this.frameworks.set('gdpr', gdprFramework);
    this.frameworks.set('ccpa', ccpaFramework);
  }

  // Data Subject Management
  async registerDataSubject(userId: number, email: string, name: string, region: string): Promise<DataSubject> {
    const dataSubject: DataSubject = {
      id: `ds-${userId}-${Date.now()}`,
      userId,
      email,
      name,
      region,
      consentRecords: [],
      dataProcessingActivities: [],
      rightsRequests: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dataSubjects.set(userId, dataSubject);

    await auditLogger.log({
      userId,
      action: 'data_subject_registered',
      entityType: 'user',
      entityId: userId,
      details: { dataSubjectId: dataSubject.id, region }
    });

    return dataSubject;
  }

  async recordConsent(
    userId: number,
    purpose: string,
    legalBasis: string,
    consentGiven: boolean,
    consentMethod: string,
    consentVersion: string
  ): Promise<ConsentRecord> {
    const dataSubject = this.dataSubjects.get(userId);
    if (!dataSubject) {
      throw new Error(`Data subject not found for user ${userId}`);
    }

    const consentRecord: ConsentRecord = {
      id: `consent-${Date.now()}`,
      dataSubjectId: dataSubject.id,
      purpose,
      legalBasis: legalBasis as any,
      consentGiven,
      consentDate: new Date(),
      consentMethod: consentMethod as any,
      consentVersion,
      isActive: consentGiven
    };

    dataSubject.consentRecords.push(consentRecord);
    dataSubject.updatedAt = new Date();

    await auditLogger.log({
      userId,
      action: 'consent_recorded',
      entityType: 'consent',
      details: {
        purpose,
        consentGiven,
        consentMethod,
        legalBasis
      }
    });

    return consentRecord;
  }

  async withdrawConsent(userId: number, consentId: string, withdrawalMethod: string): Promise<boolean> {
    const dataSubject = this.dataSubjects.get(userId);
    if (!dataSubject) return false;

    const consentRecord = dataSubject.consentRecords.find(c => c.id === consentId);
    if (!consentRecord) return false;

    consentRecord.withdrawalDate = new Date();
    consentRecord.withdrawalMethod = withdrawalMethod;
    consentRecord.isActive = false;
    dataSubject.updatedAt = new Date();

    await auditLogger.log({
      userId,
      action: 'consent_withdrawn',
      entityType: 'consent',
      details: {
        consentId,
        purpose: consentRecord.purpose,
        withdrawalMethod
      }
    });

    return true;
  }

  // Data Subject Rights Requests
  async submitRightsRequest(
    userId: number,
    requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection',
    requestDetails: string,
    verificationMethod: string
  ): Promise<DataSubjectRightsRequest> {
    const dataSubject = this.dataSubjects.get(userId);
    if (!dataSubject) {
      throw new Error(`Data subject not found for user ${userId}`);
    }

    const request: DataSubjectRightsRequest = {
      id: `req-${Date.now()}`,
      dataSubjectId: dataSubject.id,
      requestType,
      status: 'pending',
      requestDate: new Date(),
      requestDetails,
      verificationMethod,
      isVerified: false
    };

    dataSubject.rightsRequests.push(request);
    this.rightsRequests.set(request.id, request);

    await auditLogger.log({
      userId,
      action: 'rights_request_submitted',
      entityType: 'rights_request',
      details: {
        requestId: request.id,
        requestType,
        requestDetails: requestDetails.substring(0, 100)
      }
    });

    // Auto-process certain types of requests
    if (requestType === 'access' || requestType === 'portability') {
      await this.processRightsRequest(request.id);
    }

    return request;
  }

  async processRightsRequest(requestId: string): Promise<DataSubjectRightsRequest> {
    const request = this.rightsRequests.get(requestId);
    if (!request) {
      throw new Error(`Rights request ${requestId} not found`);
    }

    request.status = 'in_progress';

    try {
      switch (request.requestType) {
        case 'access':
          request.responseData = await this.generateAccessReport(request.dataSubjectId);
          break;
        case 'portability':
          request.responseData = await this.generatePortabilityExport(request.dataSubjectId);
          break;
        case 'erasure':
          await this.processErasureRequest(request.dataSubjectId);
          break;
        case 'rectification':
          // Manual process - requires human intervention
          request.processingNotes = 'Rectification request requires manual review';
          break;
        case 'restriction':
          await this.processRestrictionRequest(request.dataSubjectId);
          break;
        case 'objection':
          await this.processObjectionRequest(request.dataSubjectId);
          break;
      }

      request.status = 'completed';
      request.completionDate = new Date();

      await auditLogger.log({
        action: 'rights_request_processed',
        entityType: 'rights_request',
        details: {
          requestId,
          requestType: request.requestType,
          status: request.status
        }
      });

    } catch (error) {
      request.status = 'rejected';
      request.rejectionReason = error instanceof Error ? error.message : 'Unknown error';
      request.completionDate = new Date();
    }

    return request;
  }

  private async generateAccessReport(dataSubjectId: string): Promise<any> {
    const dataSubject = this.dataSubjects.get(parseInt(dataSubjectId.split('-')[1]));
    if (!dataSubject) return null;

    // Collect all personal data
    const userData = await db.select().from(users).where(eq(users.id, dataSubject.userId));
    const userTrips = await db.select().from(trips).where(eq(trips.user_id, dataSubject.userId));
    const userActivities = await db.select().from(activities).where(
      inArray(activities.trip_id, userTrips.map(t => t.id))
    );

    return {
      personalData: {
        profile: userData[0],
        trips: userTrips,
        activities: userActivities,
        consents: dataSubject.consentRecords,
        processingActivities: dataSubject.dataProcessingActivities
      },
      dataCategories: [
        'Identity data',
        'Contact data',
        'Travel preferences',
        'Location data',
        'Usage data'
      ],
      processingPurposes: [
        'Trip planning and management',
        'Service improvement',
        'Communication',
        'Legal compliance'
      ],
      retentionPeriods: {
        'Profile data': '7 years after account closure',
        'Trip data': '3 years after trip completion',
        'Usage data': '2 years'
      },
      thirdPartyRecipients: [
        'Travel service providers',
        'Payment processors',
        'Analytics providers'
      ]
    };
  }

  private async generatePortabilityExport(dataSubjectId: string): Promise<any> {
    const accessReport = await this.generateAccessReport(dataSubjectId);
    
    // Format data in structured, machine-readable format
    return {
      format: 'JSON',
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: accessReport.personalData
    };
  }

  private async processErasureRequest(dataSubjectId: string): Promise<void> {
    const dataSubject = this.dataSubjects.get(parseInt(dataSubjectId.split('-')[1]));
    if (!dataSubject) return;

    // Check for legal grounds to retain data
    const hasLegalGrounds = await this.checkLegalGroundsForRetention(dataSubject.userId);
    
    if (hasLegalGrounds) {
      throw new Error('Cannot delete data due to legal retention requirements');
    }

    // Anonymize or delete data
    await this.anonymizeUserData(dataSubject.userId);
  }

  private async processRestrictionRequest(dataSubjectId: string): Promise<void> {
    const dataSubject = this.dataSubjects.get(parseInt(dataSubjectId.split('-')[1]));
    if (!dataSubject) return;

    // Mark data for restricted processing
    // Implementation would depend on specific business logic
    console.log(`Processing restriction request for data subject ${dataSubjectId}`);
  }

  private async processObjectionRequest(dataSubjectId: string): Promise<void> {
    const dataSubject = this.dataSubjects.get(parseInt(dataSubjectId.split('-')[1]));
    if (!dataSubject) return;

    // Stop processing based on legitimate interests
    // Implementation would depend on specific business logic
    console.log(`Processing objection request for data subject ${dataSubjectId}`);
  }

  private async checkLegalGroundsForRetention(userId: number): Promise<boolean> {
    // Check for legal, regulatory, or contractual obligations
    // This is a simplified check - real implementation would be more complex
    
    // Check for active contracts
    const activeTrips = await db.select().from(trips).where(
      and(
        eq(trips.user_id, userId),
        gte(trips.end_date, new Date())
      )
    );

    return activeTrips.length > 0;
  }

  private async anonymizeUserData(userId: number): Promise<void> {
    const anonymizedEmail = `deleted-${crypto.randomBytes(8).toString('hex')}@example.com`;
    const anonymizedName = `Deleted User ${crypto.randomBytes(4).toString('hex')}`;

    // Anonymize user data
    await db.update(users)
      .set({
        email: anonymizedEmail,
        username: anonymizedName,
        first_name: 'Deleted',
        last_name: 'User'
      })
      .where(eq(users.id, userId));

    // Remove from data subjects map
    this.dataSubjects.delete(userId);
  }

  // Compliance Monitoring
  async runComplianceCheck(organizationId: number, framework: string): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    const frameworkConfig = this.frameworks.get(framework);
    
    if (!frameworkConfig) {
      throw new Error(`Framework ${framework} not found`);
    }

    for (const requirement of frameworkConfig.requirements) {
      if (requirement.implementation.automated) {
        const checkResult = await this.runRequirementCheck(requirement, organizationId);
        if (checkResult.violations.length > 0) {
          violations.push(...checkResult.violations);
        }
      }
    }

    return violations;
  }

  private async runRequirementCheck(requirement: ComplianceRequirement, organizationId: number): Promise<{ violations: ComplianceViolation[] }> {
    const violations: ComplianceViolation[] = [];

    switch (requirement.id) {
      case 'gdpr-retention':
      case 'ccpa-retention':
        // Check data retention periods
        const retentionViolations = await this.checkDataRetention(organizationId);
        violations.push(...retentionViolations);
        break;
        
      case 'gdpr-consent':
      case 'ccpa-consent':
        // Check consent records
        const consentViolations = await this.checkConsentCompliance(organizationId);
        violations.push(...consentViolations);
        break;
        
      default:
        // Other checks would be implemented here
        break;
    }

    return { violations };
  }

  private async checkDataRetention(organizationId: number): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Check for trips older than retention period (3 years)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 3);
    
    const oldTrips = await db.select().from(trips).where(
      lte(trips.end_date, retentionDate)
    );

    if (oldTrips.length > 0) {
      violations.push({
        id: `retention-${Date.now()}`,
        type: 'data_retention',
        severity: 'high',
        description: `${oldTrips.length} trips exceed data retention period`,
        affectedDataSubjects: oldTrips.length,
        detectedAt: new Date(),
        status: 'open',
        remediation: 'Delete or anonymize trips older than retention period'
      });
    }

    return violations;
  }

  private async checkConsentCompliance(organizationId: number): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];
    
    // Check for users without valid consent
    let usersWithoutConsent = 0;
    
    for (const [userId, dataSubject] of this.dataSubjects.entries()) {
      const hasValidConsent = dataSubject.consentRecords.some(c => c.isActive);
      if (!hasValidConsent) {
        usersWithoutConsent++;
      }
    }

    if (usersWithoutConsent > 0) {
      violations.push({
        id: `consent-${Date.now()}`,
        type: 'consent',
        severity: 'critical',
        description: `${usersWithoutConsent} users without valid consent`,
        affectedDataSubjects: usersWithoutConsent,
        detectedAt: new Date(),
        status: 'open',
        remediation: 'Obtain valid consent or establish alternative legal basis'
      });
    }

    return violations;
  }

  // Compliance Reporting
  async generateComplianceReport(
    organizationId: number,
    reportType: 'gdpr' | 'ccpa' | 'pipeda' | 'lgpd' | 'custom',
    startDate: Date,
    endDate: Date,
    generatedBy: number
  ): Promise<ComplianceReport> {
    const violations = await this.runComplianceCheck(organizationId, reportType);
    
    // Calculate metrics
    const totalDataSubjects = this.dataSubjects.size;
    const activeConsents = Array.from(this.dataSubjects.values())
      .reduce((sum, ds) => sum + ds.consentRecords.filter(c => c.isActive).length, 0);
    const withdrawnConsents = Array.from(this.dataSubjects.values())
      .reduce((sum, ds) => sum + ds.consentRecords.filter(c => !c.isActive && c.withdrawalDate).length, 0);

    const allRightsRequests = Array.from(this.rightsRequests.values());
    const periodRequests = allRightsRequests.filter(r => 
      r.requestDate >= startDate && r.requestDate <= endDate
    );

    const rightsRequestsByType = periodRequests.reduce((acc, req) => {
      acc[req.requestType] = (acc[req.requestType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completedRequests = periodRequests.filter(r => r.status === 'completed');
    const averageResponseTime = completedRequests.length > 0 
      ? completedRequests.reduce((sum, req) => {
          if (req.completionDate) {
            return sum + (req.completionDate.getTime() - req.requestDate.getTime());
          }
          return sum;
        }, 0) / completedRequests.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    const metrics: ComplianceMetrics = {
      totalDataSubjects,
      activeConsents,
      withdrawnConsents,
      rightsRequests: {
        total: periodRequests.length,
        byType: rightsRequestsByType,
        averageResponseTime,
        completionRate: periodRequests.length > 0 ? (completedRequests.length / periodRequests.length) * 100 : 0
      },
      dataBreaches: 0, // Would be tracked separately
      retentionViolations: violations.filter(v => v.type === 'data_retention').length,
      crossBorderTransfers: 0 // Would be tracked separately
    };

    const recommendations = this.generateRecommendations(violations, metrics);

    const report: ComplianceReport = {
      id: `report-${Date.now()}`,
      organizationId,
      reportType,
      period: { startDate, endDate },
      metrics,
      violations,
      recommendations,
      generatedAt: new Date(),
      generatedBy
    };

    await auditLogger.log({
      userId: generatedBy,
      organizationId,
      action: 'compliance_report_generated',
      entityType: 'compliance_report',
      details: {
        reportId: report.id,
        reportType,
        violationsCount: violations.length,
        period: `${startDate.toISOString()} to ${endDate.toISOString()}`
      }
    });

    return report;
  }

  private generateRecommendations(violations: ComplianceViolation[], metrics: ComplianceMetrics): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push(`Address ${violations.length} compliance violations identified in this report`);
      
      const criticalViolations = violations.filter(v => v.severity === 'critical');
      if (criticalViolations.length > 0) {
        recommendations.push(`Prioritize ${criticalViolations.length} critical violations for immediate remediation`);
      }
    }

    if (metrics.rightsRequests.averageResponseTime > 30) {
      recommendations.push('Improve response time for data subject rights requests (currently exceeding 30 days)');
    }

    if (metrics.rightsRequests.completionRate < 95) {
      recommendations.push('Improve completion rate for data subject rights requests');
    }

    if (metrics.retentionViolations > 0) {
      recommendations.push('Implement automated data retention policies to prevent future violations');
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate compliance issues identified. Continue monitoring.');
    }

    return recommendations;
  }

  // Get data subject information
  async getDataSubject(userId: number): Promise<DataSubject | null> {
    return this.dataSubjects.get(userId) || null;
  }

  // Get rights request
  async getRightsRequest(requestId: string): Promise<DataSubjectRightsRequest | null> {
    return this.rightsRequests.get(requestId) || null;
  }

  // Get all rights requests for a user
  async getUserRightsRequests(userId: number): Promise<DataSubjectRightsRequest[]> {
    const dataSubject = this.dataSubjects.get(userId);
    if (!dataSubject) return [];

    return dataSubject.rightsRequests.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
  }
}

export const complianceService = ComplianceService.getInstance();

// Initialize frameworks
complianceService.initializeFrameworks();
