import { db } from './db-connection.js';
import { trips, activities, users, organizations } from '../shared/src/schema.js';
import { eq, and, gte, lte, sum, count } from 'drizzle-orm';
import { auditLogger } from './auditLogger.js';

export interface PolicyRule {
  id: string;
  organizationId: number;
  name: string;
  description: string;
  type: 'budget' | 'approval' | 'booking' | 'travel' | 'expense' | 'compliance';
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  severity: 'warning' | 'error' | 'info';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface PolicyAction {
  type: 'block' | 'require_approval' | 'notify' | 'auto_approve' | 'flag';
  target?: string;
  message?: string;
  approverRoles?: string[];
}

export interface PolicyViolation {
  id: string;
  ruleId: string;
  entityType: 'trip' | 'activity' | 'expense' | 'booking';
  entityId: number;
  userId: number;
  organizationId: number;
  severity: 'warning' | 'error' | 'info';
  message: string;
  status: 'active' | 'resolved' | 'ignored';
  resolvedBy?: number;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface ComplianceCheck {
  passed: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  requiresApproval: boolean;
  approvalRequired: {
    ruleId: string;
    approverRoles: string[];
    message: string;
  }[];
}

export class PolicyEngine {
  private static instance: PolicyEngine;
  private rules: Map<number, PolicyRule[]> = new Map();

  static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  async loadPoliciesForOrganization(organizationId: number): Promise<PolicyRule[]> {
    // In a real implementation, this would load from database
    const defaultPolicies: PolicyRule[] = [
      {
        id: 'budget-limit-500',
        organizationId,
        name: 'Trip Budget Limit',
        description: 'Trips over $500 require manager approval',
        type: 'budget',
        conditions: [
          { field: 'totalBudget', operator: 'greater_than', value: 500 }
        ],
        actions: [
          { type: 'require_approval', approverRoles: ['manager', 'admin'], message: 'Trip exceeds budget limit' }
        ],
        severity: 'warning',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'international-travel',
        organizationId,
        name: 'International Travel Policy',
        description: 'International travel requires executive approval',
        type: 'travel',
        conditions: [
          { field: 'isInternational', operator: 'equals', value: true }
        ],
        actions: [
          { type: 'require_approval', approverRoles: ['admin'], message: 'International travel requires executive approval' }
        ],
        severity: 'error',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'advance-booking',
        organizationId,
        name: 'Advance Booking Requirement',
        description: 'Flights must be booked at least 7 days in advance',
        type: 'booking',
        conditions: [
          { field: 'daysUntilTravel', operator: 'less_than', value: 7 }
        ],
        actions: [
          { type: 'require_approval', approverRoles: ['manager'], message: 'Last-minute booking requires approval' }
        ],
        severity: 'warning',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'expense-receipt',
        organizationId,
        name: 'Receipt Requirement',
        description: 'Expenses over $25 require receipts',
        type: 'expense',
        conditions: [
          { field: 'amount', operator: 'greater_than', value: 25 },
          { field: 'hasReceipt', operator: 'equals', value: false, logicalOperator: 'AND' }
        ],
        actions: [
          { type: 'flag', message: 'Receipt required for expenses over $25' }
        ],
        severity: 'error',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'preferred-vendors',
        organizationId,
        name: 'Preferred Vendor Policy',
        description: 'Use preferred vendors when available',
        type: 'booking',
        conditions: [
          { field: 'vendorType', operator: 'not_in', value: ['preferred_airline', 'preferred_hotel'] }
        ],
        actions: [
          { type: 'notify', message: 'Consider using preferred vendors for better rates' }
        ],
        severity: 'info',
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    this.rules.set(organizationId, defaultPolicies);
    return defaultPolicies;
  }

  async checkTripCompliance(tripData: any, userId: number, organizationId: number): Promise<ComplianceCheck> {
    const rules = this.rules.get(organizationId) || await this.loadPoliciesForOrganization(organizationId);
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    const approvalRequired: any[] = [];

    for (const rule of rules.filter(r => r.enabled)) {
      const violatesRule = this.evaluateConditions(rule.conditions, tripData);
      
      if (violatesRule) {
        const violation: PolicyViolation = {
          id: `${rule.id}-${Date.now()}`,
          ruleId: rule.id,
          entityType: 'trip',
          entityId: tripData.id || 0,
          userId,
          organizationId,
          severity: rule.severity,
          message: rule.description,
          status: 'active',
          createdAt: new Date()
        };

        if (rule.severity === 'error') {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }

        // Check if approval is required
        const approvalActions = rule.actions.filter(a => a.type === 'require_approval');
        for (const action of approvalActions) {
          approvalRequired.push({
            ruleId: rule.id,
            approverRoles: action.approverRoles || [],
            message: action.message || rule.description
          });
        }

        // Log the violation
        await auditLogger.log({
          userId,
          organizationId,
          action: 'policy_violation',
          entityType: 'trip',
          entityId: tripData.id || 0,
          details: {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.description
          }
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresApproval: approvalRequired.length > 0,
      approvalRequired
    };
  }

  async checkExpenseCompliance(expenseData: any, userId: number, organizationId: number): Promise<ComplianceCheck> {
    const rules = this.rules.get(organizationId) || await this.loadPoliciesForOrganization(organizationId);
    const violations: PolicyViolation[] = [];
    const warnings: PolicyViolation[] = [];
    const approvalRequired: any[] = [];

    for (const rule of rules.filter(r => r.enabled && r.type === 'expense')) {
      const violatesRule = this.evaluateConditions(rule.conditions, expenseData);
      
      if (violatesRule) {
        const violation: PolicyViolation = {
          id: `${rule.id}-${Date.now()}`,
          ruleId: rule.id,
          entityType: 'expense',
          entityId: expenseData.id || 0,
          userId,
          organizationId,
          severity: rule.severity,
          message: rule.description,
          status: 'active',
          createdAt: new Date()
        };

        if (rule.severity === 'error') {
          violations.push(violation);
        } else {
          warnings.push(violation);
        }

        const approvalActions = rule.actions.filter(a => a.type === 'require_approval');
        for (const action of approvalActions) {
          approvalRequired.push({
            ruleId: rule.id,
            approverRoles: action.approverRoles || [],
            message: action.message || rule.description
          });
        }
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresApproval: approvalRequired.length > 0,
      approvalRequired
    };
  }

  private evaluateConditions(conditions: PolicyCondition[], data: any): boolean {
    if (conditions.length === 0) return false;

    let result = this.evaluateCondition(conditions[0], data);
    
    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);
      
      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: PolicyCondition, data: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, data);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, data: any): any {
    const fields = field.split('.');
    let value = data;
    
    for (const f of fields) {
      value = value?.[f];
    }
    
    return value;
  }

  async createPolicy(organizationId: number, policy: Omit<PolicyRule, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>): Promise<PolicyRule> {
    const newPolicy: PolicyRule = {
      ...policy,
      id: `policy-${Date.now()}`,
      organizationId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const orgRules = this.rules.get(organizationId) || [];
    orgRules.push(newPolicy);
    this.rules.set(organizationId, orgRules);

    return newPolicy;
  }

  async updatePolicy(organizationId: number, policyId: string, updates: Partial<PolicyRule>): Promise<PolicyRule | null> {
    const orgRules = this.rules.get(organizationId) || [];
    const policyIndex = orgRules.findIndex(p => p.id === policyId);
    
    if (policyIndex === -1) return null;

    orgRules[policyIndex] = {
      ...orgRules[policyIndex],
      ...updates,
      updatedAt: new Date()
    };

    return orgRules[policyIndex];
  }

  async deletePolicy(organizationId: number, policyId: string): Promise<boolean> {
    const orgRules = this.rules.get(organizationId) || [];
    const filteredRules = orgRules.filter(p => p.id !== policyId);
    
    if (filteredRules.length === orgRules.length) return false;
    
    this.rules.set(organizationId, filteredRules);
    return true;
  }

  async getPoliciesForOrganization(organizationId: number): Promise<PolicyRule[]> {
    return this.rules.get(organizationId) || await this.loadPoliciesForOrganization(organizationId);
  }
}

export const policyEngine = PolicyEngine.getInstance();
