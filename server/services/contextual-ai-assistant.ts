import { OpenAI } from 'openai';
import { z } from 'zod';
import { db } from '../db-connection.js';
import { trips, organizations, users } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schemas for AI assistant
const AssistantRequestSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  query: z.string(),
  context: z.object({
    currentTrip: z.string().optional(),
    location: z.string().optional(),
    timeZone: z.string().optional(),
    urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
});

const PolicyComplianceSchema = z.object({
  compliant: z.boolean(),
  violations: z.array(z.object({
    policy: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    recommendation: z.string(),
  })),
  approvalRequired: z.boolean(),
  approver: z.string().optional(),
  justification: z.string().optional(),
});

export class ContextualAIAssistant {
  /**
   * Corporate Policy Integration - Automatic compliance checking
   */
  async checkPolicyCompliance(
    organizationId: string,
    tripDetails: any
  ): Promise<z.infer<typeof PolicyComplianceSchema>> {
    try {
      // Get organization policies
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      // AI-powered policy compliance check
      const compliancePrompt = `
        Check corporate travel policy compliance:
        
        Organization: ${organization.name}
        Organization Policies: ${JSON.stringify(organization.settings)}
        Trip Details: ${JSON.stringify(tripDetails)}
        
        Analyze compliance with:
        1. Budget limits and spending policies
        2. Travel class restrictions
        3. Booking advance requirements
        4. Destination restrictions
        5. Duration limits
        6. Approval requirements
        7. Preferred vendor policies
        8. Safety and security requirements
        
        Return compliance analysis with:
        - Overall compliance status
        - Specific violations with severity
        - Required approvals
        - Recommendations for compliance
        
        Return as JSON matching PolicyComplianceSchema.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate travel policy compliance expert. Analyze travel requests against company policies and provide detailed compliance assessments.',
          },
          {
            role: 'user',
            content: compliancePrompt,
          },
        ],
        temperature: 0.2,
      });

      const compliance = JSON.parse(response.choices[0].message.content || '{}');
      return PolicyComplianceSchema.parse(compliance);
    } catch (error) {
      console.error('Policy compliance check error:', error);
      throw new Error('Failed to check policy compliance');
    }
  }

  /**
   * Proactive Travel Management - Intelligent travel assistance
   */
  async processAssistantQuery(request: z.infer<typeof AssistantRequestSchema>) {
    try {
      const { organizationId, userId, query, context, conversationHistory } = request;

      // Get user and organization context
      const [user, organization] = await Promise.all([
        db.query.users.findFirst({
          where: eq(users.id, userId),
        }),
        db.query.organizations.findFirst({
          where: eq(organizations.id, organizationId),
        }),
      ]);

      // Get user's recent trips for context
      const recentTrips = await db.query.trips.findMany({
        where: and(
          eq(trips.userId, userId),
          eq(trips.organizationId, organizationId)
        ),
        orderBy: desc(trips.createdAt),
        limit: 5,
      });

      // Get current trip details if specified
      let currentTrip = null;
      if (context?.currentTrip) {
        currentTrip = await db.query.trips.findFirst({
          where: eq(trips.id, context.currentTrip),
        });
      }

      // Build comprehensive context for AI
      const assistantPrompt = `
        You are NestMap's AI Travel Assistant for corporate travel management.
        
        User Context:
        - User: ${user?.username} (${user?.email})
        - Organization: ${organization?.name}
        - Current Location: ${context?.location || 'Unknown'}
        - Time Zone: ${context?.timeZone || 'Unknown'}
        - Urgency: ${context?.urgency || 'medium'}
        
        Current Trip: ${currentTrip ? JSON.stringify(currentTrip) : 'None'}
        Recent Trips: ${JSON.stringify(recentTrips)}
        Organization Policies: ${JSON.stringify(organization?.settings)}
        
        Conversation History: ${JSON.stringify(conversationHistory || [])}
        
        User Query: "${query}"
        
        Provide intelligent assistance with:
        1. Travel booking and modifications
        2. Policy compliance guidance
        3. Expense management
        4. Itinerary optimization
        5. Real-time travel alerts
        6. Emergency assistance
        7. Meeting coordination
        8. Local recommendations
        
        Be proactive, contextual, and corporate-focused.
        Always consider company policies and budget constraints.
        Provide actionable recommendations with specific next steps.
        
        If the query requires booking or modifications, provide step-by-step guidance.
        If there are policy implications, explain them clearly.
        If urgent assistance is needed, prioritize immediate solutions.
        
        Return response as JSON with:
        {
          "response": "Your detailed response",
          "actionItems": ["List of specific actions user can take"],
          "policyAlerts": ["Any policy-related warnings or requirements"],
          "recommendations": ["Proactive suggestions"],
          "urgency": "low|medium|high",
          "followUpQuestions": ["Questions to gather more context if needed"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert corporate travel assistant with deep knowledge of business travel, policies, and optimization.',
          },
          {
            role: 'user',
            content: assistantPrompt,
          },
        ],
        temperature: 0.4,
      });

      const assistantResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      // Log interaction for learning and improvement
      await this.logAssistantInteraction(organizationId, userId, query, assistantResponse);
      
      return assistantResponse;
    } catch (error) {
      console.error('Assistant query processing error:', error);
      throw new Error('Failed to process assistant query');
    }
  }

  /**
   * Meeting & Event Intelligence - Calendar integration and coordination
   */
  async optimizeMeetingTravel(organizationId: string, meetingDetails: any) {
    try {
      const meetingPrompt = `
        Optimize travel for business meeting:
        
        Organization ID: ${organizationId}
        Meeting Details: ${JSON.stringify(meetingDetails)}
        
        Provide meeting travel optimization with:
        1. Optimal arrival/departure times
        2. Venue recommendations based on attendee locations
        3. Group travel coordination suggestions
        4. Local transportation recommendations
        5. Accommodation suggestions near venue
        6. Meeting room booking assistance
        7. Catering and logistics support
        8. Post-meeting follow-up automation
        
        Consider:
        - Attendee time zones and locations
        - Meeting duration and schedule
        - Budget constraints
        - Company policies
        - Local business customs
        
        Return comprehensive meeting travel plan as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate meeting and event travel specialist focused on optimizing business travel for meetings and events.',
          },
          {
            role: 'user',
            content: meetingPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Meeting travel optimization error:', error);
      throw new Error('Failed to optimize meeting travel');
    }
  }

  /**
   * Emergency Travel Support - 24/7 assistance
   */
  async handleEmergencyAssistance(organizationId: string, userId: string, emergency: any) {
    try {
      const emergencyPrompt = `
        Handle travel emergency assistance:
        
        Organization ID: ${organizationId}
        User ID: ${userId}
        Emergency Details: ${JSON.stringify(emergency)}
        Current Time: ${new Date().toISOString()}
        
        Provide immediate emergency assistance with:
        1. Immediate action steps
        2. Emergency contact information
        3. Rebooking options and alternatives
        4. Insurance claim guidance
        5. Local emergency services
        6. Company notification procedures
        7. Documentation requirements
        8. Follow-up support plan
        
        Prioritize:
        - Traveler safety and security
        - Immediate problem resolution
        - Clear action steps
        - Emergency contact information
        - Company policy compliance
        
        Return emergency response plan as JSON with high urgency.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an emergency travel assistance specialist. Provide immediate, actionable help for travel emergencies with focus on safety and resolution.',
          },
          {
            role: 'user',
            content: emergencyPrompt,
          },
        ],
        temperature: 0.2,
      });

      const emergencyResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      // Log emergency for follow-up and analysis
      await this.logEmergencyIncident(organizationId, userId, emergency, emergencyResponse);
      
      return emergencyResponse;
    } catch (error) {
      console.error('Emergency assistance error:', error);
      throw new Error('Failed to handle emergency assistance');
    }
  }

  /**
   * Approval Workflow Automation - Streamlined approval process
   */
  async processApprovalWorkflow(organizationId: string, tripRequest: any) {
    try {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
      });

      const approvalPrompt = `
        Process travel approval workflow:
        
        Organization: ${organization?.name}
        Organization Settings: ${JSON.stringify(organization?.settings)}
        Trip Request: ${JSON.stringify(tripRequest)}
        
        Determine approval workflow with:
        1. Required approval levels
        2. Appropriate approvers
        3. Approval criteria and thresholds
        4. Automated approval eligibility
        5. Exception handling requirements
        6. Notification procedures
        7. Timeline expectations
        8. Documentation requirements
        
        Consider:
        - Trip cost and budget limits
        - Destination risk levels
        - Travel duration
        - Policy compliance
        - User's approval history
        - Organizational hierarchy
        
        Return approval workflow plan as JSON.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a corporate travel approval workflow specialist. Design efficient approval processes that balance control with user experience.',
          },
          {
            role: 'user',
            content: approvalPrompt,
          },
        ],
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Approval workflow error:', error);
      throw new Error('Failed to process approval workflow');
    }
  }

  // Helper methods
  private async logAssistantInteraction(organizationId: string, userId: string, query: string, response: any) {
    // Log interaction for analytics and improvement
    console.log('Assistant interaction logged:', {
      organizationId,
      userId,
      query,
      response,
      timestamp: new Date().toISOString(),
    });
  }

  private async logEmergencyIncident(organizationId: string, userId: string, emergency: any, response: any) {
    // Log emergency incident for follow-up and analysis
    console.log('Emergency incident logged:', {
      organizationId,
      userId,
      emergency,
      response,
      timestamp: new Date().toISOString(),
    });
  }
}

export const contextualAIAssistant = new ContextualAIAssistant();
