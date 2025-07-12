import { sendNotificationEmail } from './emailService.js';
import { sendPushNotification, sendPushToMultipleSubscriptions } from './pushNotifications.js';

interface NotificationData {
  userId: number;
  type: 'trip_shared' | 'booking_confirmed' | 'activity_reminder' | 'team_invite' | 'payment_due' | 'system.js';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  data?: any;
}

interface UserNotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  tripReminders: boolean;
  bookingUpdates: boolean;
  promotionalEmails: boolean;
  weeklyDigest: boolean;
  instantUpdates: boolean;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// In-memory storage for demo - replace with database in production
const userPreferences = new Map<number, UserNotificationPreferences>();
const userPushSubscriptions = new Map<number, PushSubscription[]>();
const userEmails = new Map<number, string>();

export async function sendNotification(
  notification: NotificationData,
  userEmail: string,
  preferences: UserNotificationPreferences,
  pushSubscriptions: PushSubscription[] = []
): Promise<{ emailSent: boolean; pushSent: number; pushFailed: number }> {
  let emailSent = false;
  let pushSent = 0;
  let pushFailed = 0;

  // Send email notification if enabled
  if (preferences.emailNotifications && shouldSendEmailForType(notification.type, preferences)) {
    try {
      emailSent = await sendNotificationEmail({
        to: userEmail,
        subject: notification.title,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        type: notification.type
      });
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }

  // Send push notification if enabled
  if (preferences.pushNotifications && pushSubscriptions.length > 0) {
    try {
      const pushResult = await sendPushToMultipleSubscriptions(pushSubscriptions, {
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        data: {
          url: notification.actionUrl,
          ...notification.data
        },
        actions: notification.actionUrl ? [{
          action: 'view',
          title: notification.actionText || 'View Details'
        }] : []
      });
      pushSent = pushResult.sent;
      pushFailed = pushResult.failed;
    } catch (error) {
      console.error('Push notification failed:', error);
    }
  }

  console.log(`Notification sent: Email: ${emailSent}, Push: ${pushSent}/${pushSent + pushFailed}`);
  return { emailSent, pushSent, pushFailed };
}

function shouldSendEmailForType(
  type: string,
  preferences: UserNotificationPreferences
): boolean {
  switch (type) {
    case 'trip_shared':
    case 'team_invite':
      return preferences.instantUpdates;
    case 'booking_confirmed':
    case 'activity_reminder':
      return preferences.bookingUpdates && preferences.tripReminders;
    case 'payment_due':
      return true; // Always send payment notifications
    case 'system':
      return preferences.instantUpdates;
    default:
      return preferences.instantUpdates;
  }
}

// Demo storage functions - replace with database queries in production
export function setUserPreferences(userId: number, preferences: UserNotificationPreferences): void {
  userPreferences.set(userId, preferences);
}

export function getUserPreferences(userId: number): UserNotificationPreferences {
  return userPreferences.get(userId) || {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    tripReminders: true,
    bookingUpdates: true,
    promotionalEmails: false,
    weeklyDigest: true,
    instantUpdates: true
  };
}

export function setUserEmail(userId: number, email: string): void {
  userEmails.set(userId, email);
}

export function getUserEmail(userId: number): string | undefined {
  return userEmails.get(userId);
}

export function addPushSubscription(userId: number, subscription: PushSubscription): void {
  const existing = userPushSubscriptions.get(userId) || [];
  // Remove duplicate subscriptions
  const filtered = existing.filter(sub => sub.endpoint !== subscription.endpoint);
  filtered.push(subscription);
  userPushSubscriptions.set(userId, filtered);
}

export function removePushSubscription(userId: number, endpoint: string): void {
  const existing = userPushSubscriptions.get(userId) || [];
  const filtered = existing.filter(sub => sub.endpoint !== endpoint);
  userPushSubscriptions.set(userId, filtered);
}

export function getUserPushSubscriptions(userId: number): PushSubscription[] {
  return userPushSubscriptions.get(userId) || [];
}

// Quick notification helpers for common scenarios
export async function notifyTripShared(
  userId: number,
  tripTitle: string,
  sharedByName: string,
  tripId: number
): Promise<void> {
  const userEmail = getUserEmail(userId);
  const preferences = getUserPreferences(userId);
  const pushSubscriptions = getUserPushSubscriptions(userId);

  if (!userEmail) return;

  await sendNotification({
    userId,
    type: 'trip_shared',
    title: 'Trip shared with you',
    message: `${sharedByName} shared "${tripTitle}" with you`,
    actionUrl: `/trips/${tripId}`,
    actionText: 'View Trip'
  }, userEmail, preferences, pushSubscriptions);
}

export async function notifyBookingConfirmed(
  userId: number,
  bookingType: string,
  bookingDetails: string,
  bookingId: string
): Promise<void> {
  const userEmail = getUserEmail(userId);
  const preferences = getUserPreferences(userId);
  const pushSubscriptions = getUserPushSubscriptions(userId);

  if (!userEmail) return;

  await sendNotification({
    userId,
    type: 'booking_confirmed',
    title: `${bookingType} booking confirmed`,
    message: bookingDetails,
    actionUrl: `/bookings/${bookingId}`,
    actionText: 'View Booking'
  }, userEmail, preferences, pushSubscriptions);
}

export async function notifyActivityReminder(
  userId: number,
  activityTitle: string,
  timeUntil: string,
  tripId: number
): Promise<void> {
  const userEmail = getUserEmail(userId);
  const preferences = getUserPreferences(userId);
  const pushSubscriptions = getUserPushSubscriptions(userId);

  if (!userEmail) return;

  await sendNotification({
    userId,
    type: 'activity_reminder',
    title: 'Activity starting soon',
    message: `${activityTitle} starts ${timeUntil}`,
    actionUrl: `/trips/${tripId}`,
    actionText: 'View Trip'
  }, userEmail, preferences, pushSubscriptions);
}