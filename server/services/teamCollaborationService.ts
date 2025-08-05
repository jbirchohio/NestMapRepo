import { db } from '../db';
import { 
  trips, 
  users, 
  tripCollaborators,
  tripComments,
  activityLog,
  notifications,
  calendarIntegrations,
  InsertTripComment,
  InsertActivityLog,
  TripComment
} from '@shared/schema';
import { eq, and, or, desc, inArray, sql } from 'drizzle-orm';
// WebSocket integration removed - not exported from websocket module
import { sendEmail } from '../emailService';

interface TeamCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'trip' | 'activity' | 'meeting' | 'deadline';
  tripId?: number;
  activityId?: number;
  attendees: Array<{
    userId: number;
    name: string;
    email: string;
    status: 'accepted' | 'tentative' | 'declined';
  }>;
  location?: string;
  isAllDay: boolean;
  color?: string;
}

interface TeamPresence {
  userId: number;
  userName: string;
  status: 'in_office' | 'traveling' | 'remote' | 'off';
  currentLocation?: string;
  currentTrip?: {
    id: number;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
  nextTrip?: {
    id: number;
    destination: string;
    startDate: Date;
  };
  timezone?: string;
  localTime?: string;
}

export class TeamCollaborationService {
  // Add comment to trip or activity
  async addComment(
    data: Omit<InsertTripComment, 'created_at' | 'updated_at'>
  ): Promise<TripComment> {
    const [comment] = await db.insert(tripComments)
      .values(data)
      .returning();

    // Log activity
    await this.logActivity({
      tripId: data.trip_id,
      userId: data.user_id,
      organizationId: data.organization_id,
      action: 'commented',
      entityType: data.activity_id ? 'activity' : 'trip',
      entityId: data.activity_id || data.trip_id,
      metadata: {
        commentId: comment.id,
        parentId: data.parent_id
      }
    });

    // Notify mentioned users
    const mentions = this.extractMentions(data.content);
    if (mentions.length > 0) {
      await this.notifyMentionedUsers(mentions, comment);
    }

    // Real-time updates would be sent via WebSocket here
    // WebSocket integration needs to be properly exported from websocket module

    return comment;
  }

  // Get comments thread
  async getComments(
    tripId: number,
    activityId?: number
  ): Promise<Array<TripComment & { user: any; replies: TripComment[] }>> {
    const baseComments = await db.select({
      comment: tripComments,
      user: users
    })
    .from(tripComments)
    .innerJoin(users, eq(tripComments.user_id, users.id))
    .where(
      and(
        eq(tripComments.trip_id, tripId),
        activityId ? eq(tripComments.activity_id, activityId) : sql`${tripComments.activity_id} IS NULL`,
        sql`${tripComments.parent_id} IS NULL`
      )
    )
    .orderBy(desc(tripComments.created_at));

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      baseComments.map(async ({ comment, user }) => {
        const replies = await db.select()
          .from(tripComments)
          .where(eq(tripComments.parent_id, comment.id))
          .orderBy(tripComments.created_at);

        return {
          ...comment,
          user,
          replies
        };
      })
    );

    return commentsWithReplies;
  }

  // Get team calendar events
  async getTeamCalendar(
    organizationId: number,
    startDate: Date,
    endDate: Date,
    userIds?: number[]
  ): Promise<TeamCalendarEvent[]> {
    const events: TeamCalendarEvent[] = [];

    // Get trips
    const tripQuery = db.select({
      trip: trips,
      collaborators: tripCollaborators
    })
    .from(trips)
    .leftJoin(tripCollaborators, eq(trips.id, tripCollaborators.trip_id))
    .where(
      and(
        eq(trips.organization_id, organizationId),
        or(
          and(
            sql`${trips.start_date} >= ${startDate}`,
            sql`${trips.start_date} <= ${endDate}`
          ),
          and(
            sql`${trips.end_date} >= ${startDate}`,
            sql`${trips.end_date} <= ${endDate}`
          )
        ),
        userIds && userIds.length > 0
          ? or(
              inArray(trips.user_id, userIds),
              inArray(tripCollaborators.user_id, userIds)
            )
          : sql`true`
      )
    );

    const tripData = await tripQuery;

    // Group trips and get attendees
    const tripMap = new Map<number, any>();
    for (const { trip, collaborators } of tripData) {
      if (!tripMap.has(trip.id)) {
        tripMap.set(trip.id, {
          trip,
          attendees: []
        });
      }
      if (collaborators) {
        tripMap.get(trip.id).attendees.push(collaborators);
      }
    }

    // Convert to calendar events
    for (const { trip, attendees } of tripMap.values()) {
      // Get user details for attendees
      const userDetails = await db.select()
        .from(users)
        .where(
          inArray(users.id, [
            trip.user_id,
            ...attendees.map((a: any) => a.user_id)
          ])
        );

      const event: TeamCalendarEvent = {
        id: `trip-${trip.id}`,
        title: trip.title,
        description: `Business trip to ${trip.city || trip.location}`,
        start: trip.start_date,
        end: trip.end_date,
        type: 'trip',
        tripId: trip.id,
        attendees: userDetails.map(user => ({
          userId: user.id,
          name: user.display_name || user.username,
          email: user.email,
          status: user.id === trip.user_id ? 'accepted' : 
            attendees.find((a: any) => a.user_id === user.id)?.status || 'tentative'
        })),
        location: trip.city || trip.location,
        isAllDay: true,
        color: '#3B82F6' // Blue for trips
      };

      events.push(event);
    }

    // TODO: Add activities, meetings, and deadlines

    return events;
  }

  // Get team presence/availability
  async getTeamPresence(
    organizationId: number,
    date: Date = new Date()
  ): Promise<TeamPresence[]> {
    // Get all organization members
    const members = await db.select({
      user: users,
      currentTrip: trips
    })
    .from(users)
    .leftJoin(
      trips,
      and(
        eq(trips.user_id, users.id),
        sql`${trips.start_date} <= ${date}`,
        sql`${trips.end_date} >= ${date}`,
        eq(trips.completed, false)
      )
    )
    .where(eq(users.organization_id, organizationId));

    const presence: TeamPresence[] = [];

    for (const { user, currentTrip } of members) {
      // Get next upcoming trip
      const [nextTrip] = await db.select()
        .from(trips)
        .where(
          and(
            eq(trips.user_id, user.id),
            sql`${trips.start_date} > ${date}`,
            eq(trips.completed, false)
          )
        )
        .orderBy(trips.start_date)
        .limit(1);

      const userPresence: TeamPresence = {
        userId: user.id,
        userName: user.display_name || user.username,
        status: currentTrip ? 'traveling' : 'in_office',
        currentLocation: currentTrip?.city || undefined,
        currentTrip: currentTrip ? {
          id: currentTrip.id,
          destination: currentTrip.city || currentTrip.location || 'Unknown',
          startDate: currentTrip.start_date,
          endDate: currentTrip.end_date
        } : undefined,
        nextTrip: nextTrip ? {
          id: nextTrip.id,
          destination: nextTrip.city || nextTrip.location || 'Unknown',
          startDate: nextTrip.start_date
        } : undefined,
        timezone: this.getTimezoneFromLocation(currentTrip?.city),
        localTime: this.getLocalTime(currentTrip?.city)
      };

      presence.push(userPresence);
    }

    return presence;
  }

  // Create shared expense report
  async createSharedExpenseReport(
    tripId: number,
    userIds: number[],
    expenses: Array<{
      userId: number;
      amount: number;
      description: string;
      category: string;
    }>
  ): Promise<{
    totalAmount: number;
    perPerson: number;
    balances: Record<number, number>;
    settlements: Array<{ from: number; to: number; amount: number }>;
  }> {
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const perPerson = totalAmount / userIds.length;

    // Calculate who owes what
    const balances: Record<number, number> = {};
    for (const userId of userIds) {
      const userExpenses = expenses
        .filter(exp => exp.userId === userId)
        .reduce((sum, exp) => sum + exp.amount, 0);
      balances[userId] = userExpenses - perPerson;
    }

    // Calculate optimal settlements
    const settlements = this.calculateSettlements(balances);

    // Log activity - skip for now as we don't have organization context here
    // await this.logActivity({
    //   tripId,
    //   userId: userIds[0],
    //   organizationId: 0,
    //   action: 'created',
    //   entityType: 'expense_report',
    //   entityId: tripId,
    //   metadata: {
    //     totalAmount,
    //     participantCount: userIds.length,
    //     settlements
    //   }
    // });

    return {
      totalAmount,
      perPerson,
      balances,
      settlements
    };
  }

  // Meeting scheduler considering travel schedules
  async findMeetingSlots(
    organizationId: number,
    attendeeIds: number[],
    duration: number, // minutes
    startRange: Date,
    endRange: Date
  ): Promise<Array<{
    start: Date;
    end: Date;
    availableAttendees: number[];
    travelingAttendees: number[];
    conflicts: Array<{ userId: number; reason: string }>;
  }>> {
    const slots: Array<{
      start: Date;
      end: Date;
      availableAttendees: number[];
      travelingAttendees: number[];
      conflicts: Array<{ userId: number; reason: string }>;
    }> = [];

    // Get all trips for attendees in date range
    const attendeeTrips = await db.select()
      .from(trips)
      .where(
        and(
          inArray(trips.user_id, attendeeIds),
          or(
            and(
              sql`${trips.start_date} <= ${endRange}`,
              sql`${trips.end_date} >= ${startRange}`
            )
          )
        )
      );

    // Check each potential slot (hourly for simplicity)
    const slotStart = new Date(startRange);
    slotStart.setHours(9, 0, 0, 0); // Start at 9 AM

    while (slotStart < endRange) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      
      if (slotEnd.getHours() <= 17) { // End by 5 PM
        const availableAttendees: number[] = [];
        const travelingAttendees: number[] = [];
        const conflicts: Array<{ userId: number; reason: string }> = [];

        for (const userId of attendeeIds) {
          const userTrips = attendeeTrips.filter(t => t.user_id === userId);
          const isAvailable = !userTrips.some(trip => 
            slotStart >= trip.start_date && slotStart <= trip.end_date
          );

          if (isAvailable) {
            availableAttendees.push(userId);
          } else {
            const conflictTrip = userTrips.find(trip => 
              slotStart >= trip.start_date && slotStart <= trip.end_date
            );
            if (conflictTrip) {
              travelingAttendees.push(userId);
              conflicts.push({
                userId,
                reason: `Traveling to ${conflictTrip.city || 'Unknown'}`
              });
            }
          }
        }

        if (availableAttendees.length >= attendeeIds.length * 0.7) { // At least 70% available
          slots.push({
            start: new Date(slotStart),
            end: new Date(slotEnd),
            availableAttendees,
            travelingAttendees,
            conflicts
          });
        }
      }

      // Move to next hour
      slotStart.setHours(slotStart.getHours() + 1);
      if (slotStart.getHours() >= 17) {
        slotStart.setDate(slotStart.getDate() + 1);
        slotStart.setHours(9, 0, 0, 0);
      }
    }

    return slots;
  }

  // Trip handover/delegation
  async delegateTrip(
    tripId: number,
    fromUserId: number,
    toUserId: number,
    notes?: string
  ): Promise<void> {
    // Update trip owner
    await db.update(trips)
      .set({
        user_id: toUserId,
        updated_at: new Date()
      })
      .where(eq(trips.id, tripId));

    // Add as collaborator with admin role
    await db.insert(tripCollaborators)
      .values({
        trip_id: tripId,
        user_id: fromUserId,
        role: 'admin',
        invited_by: fromUserId,
        status: 'accepted',
        accepted_at: new Date()
      })
      .onConflictDoNothing();

    // Log activity - skip for now as we don't have organization context here
    // await this.logActivity({
    //   tripId,
    //   userId: fromUserId,
    //   organizationId: 0,
    //   action: 'delegated',
    //   entityType: 'trip',
    //   entityId: tripId,
    //   metadata: {
    //     fromUserId,
    //     toUserId,
    //     notes
    //   }
    // });

    // Notify new owner - skip for now as we don't have organization context
    // await db.insert(notifications)
    //   .values({
    //     user_id: toUserId,
    //     organization_id: 0,
    //     type: 'trip_delegated',
    //     title: 'Trip Delegated to You',
    //     message: `You have been assigned as the owner of a trip${notes ? `: ${notes}` : ''}`,
    //     priority: 'high',
    //     metadata: { tripId, fromUserId }
    //   });
  }

  // Helper: Extract @mentions from text
  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  // Helper: Notify mentioned users
  private async notifyMentionedUsers(
    mentions: string[],
    comment: TripComment
  ): Promise<void> {
    // Find users by username
    const mentionedUsers = await db.select()
      .from(users)
      .where(inArray(users.username, mentions));

    for (const user of mentionedUsers) {
      await db.insert(notifications)
        .values({
          user_id: user.id,
          organization_id: comment.organization_id,
          type: 'mention',
          title: 'You were mentioned in a comment',
          message: comment.content.substring(0, 100) + '...',
          priority: 'normal',
          metadata: {
            commentId: comment.id,
            tripId: comment.trip_id,
            activityId: comment.activity_id
          }
        });
    }
  }

  // Helper: Calculate expense settlements
  private calculateSettlements(
    balances: Record<number, number>
  ): Array<{ from: number; to: number; amount: number }> {
    const settlements: Array<{ from: number; to: number; amount: number }> = [];
    const debtors: Array<[number, number]> = [];
    const creditors: Array<[number, number]> = [];

    // Separate debtors and creditors
    for (const [userId, balance] of Object.entries(balances)) {
      if (balance < 0) {
        debtors.push([parseInt(userId), Math.abs(balance)]);
      } else if (balance > 0) {
        creditors.push([parseInt(userId), balance]);
      }
    }

    // Sort for optimal matching
    debtors.sort((a, b) => b[1] - a[1]);
    creditors.sort((a, b) => b[1] - a[1]);

    // Match debtors with creditors
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const [debtor, debt] = debtors[i];
      const [creditor, credit] = creditors[j];
      
      const amount = Math.min(debt, credit);
      settlements.push({
        from: debtor,
        to: creditor,
        amount: Math.round(amount * 100) / 100
      });

      debtors[i][1] -= amount;
      creditors[j][1] -= amount;

      if (debtors[i][1] === 0) i++;
      if (creditors[j][1] === 0) j++;
    }

    return settlements;
  }

  // Helper: Get timezone from location
  private getTimezoneFromLocation(location?: string): string {
    // This would use a real timezone API
    const timezoneMap: Record<string, string> = {
      'New York': 'America/New_York',
      'San Francisco': 'America/Los_Angeles',
      'London': 'Europe/London',
      'Tokyo': 'Asia/Tokyo',
      'Sydney': 'Australia/Sydney'
    };

    return timezoneMap[location || ''] || 'UTC';
  }

  // Helper: Get local time
  private getLocalTime(location?: string): string {
    const timezone = this.getTimezoneFromLocation(location);
    return new Date().toLocaleTimeString('en-US', { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Log activity
  private async logActivity(
    data: Omit<InsertActivityLog, 'timestamp'>
  ): Promise<void> {
    await db.insert(activityLog).values(data);
  }
}

export const teamCollaborationService = new TeamCollaborationService();