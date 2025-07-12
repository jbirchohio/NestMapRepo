import webpush from 'web-push.js';

// Configure VAPID details for web push notifications
export function configurePushNotifications() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('✅ Push notifications configured');
  } else {
    console.log('⚠ Push notifications not configured - missing VAPID keys');
  }
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.log('Push notification skipped - no VAPID keys configured');
      return false;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      data: payload.data || {},
      actions: payload.actions || []
    });

    await webpush.sendNotification(subscription, notificationPayload);
    console.log(`✅ Push notification sent: ${payload.title}`);
    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

export async function sendPushToMultipleSubscriptions(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const promises = subscriptions.map(async (subscription) => {
    try {
      const success = await sendPushNotification(subscription, payload);
      if (success) sent++;
      else failed++;
    } catch (error) {
      failed++;
    }
  });

  await Promise.all(promises);
  return { sent, failed };
}

// Generate VAPID keys for initial setup
export function generateVAPIDKeys() {
  return webpush.generateVAPIDKeys();
}