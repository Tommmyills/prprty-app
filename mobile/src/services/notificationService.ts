/**
 * Real-Time Deadline Alert System
 * Push notifications for deadlines using Expo Notifications
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Transaction, Deadline } from "../state/realtorStore";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPreferences {
  dailyDigestEnabled: boolean;
  threeDayRemindersEnabled: boolean;
  overdueAlertsEnabled: boolean;
  dailyDigestTime: string; // "08:00" format
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: "digest" | "reminder" | "overdue";
  transactionId?: string;
  deadlineId?: string;
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return false;
  }

  // For Android, create notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("deadline-alerts", {
      name: "Deadline Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FFB800",
    });
  }

  return true;
}

/**
 * Calculate days remaining until a deadline
 */
function calculateDaysRemaining(dateString: string): number {
  const match = dateString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return 999;

  const [, month, day, year] = match;
  const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Schedule a notification for a deadline
 */
export async function scheduleDeadlineNotification(
  transaction: Transaction,
  deadline: Deadline,
  daysUntil: number
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    let title = "";
    let body = "";

    if (daysUntil < 0) {
      // Overdue
      title = "⚠️ OVERDUE Deadline";
      body = `${deadline.label} for ${transaction.address} was due ${Math.abs(daysUntil)} days ago!`;
    } else if (daysUntil === 0) {
      // Today
      title = "🔔 Deadline TODAY";
      body = `${deadline.label} for ${transaction.address} is due today!`;
    } else if (daysUntil <= 3) {
      // Within 3 days
      title = `📅 ${daysUntil} Day Reminder`;
      body = `${deadline.label} for ${transaction.address} is due in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          transactionId: transaction.id,
          deadlineId: deadline.id,
          type: daysUntil < 0 ? "overdue" : daysUntil === 0 ? "today" : "reminder",
        },
        sound: true,
        categoryIdentifier: "deadline-alert",
      },
      trigger: null, // Send immediately
    });

    return identifier;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
}

/**
 * Check all transactions for deadlines needing notifications
 */
export async function checkDeadlinesAndNotify(
  transactions: Transaction[],
  preferences: NotificationPreferences,
  lastChecked: Date
): Promise<NotificationHistoryItem[]> {
  const notifications: NotificationHistoryItem[] = [];
  const now = new Date();

  for (const transaction of transactions) {
    if (transaction.status !== "active") continue;

    for (const deadline of transaction.deadlines) {
      if (deadline.status === "completed") continue;

      const daysRemaining = calculateDaysRemaining(deadline.date);

      // Check if notification should be sent
      let shouldNotify = false;

      if (daysRemaining < 0 && preferences.overdueAlertsEnabled) {
        // Overdue - notify once per day
        shouldNotify = true;
      } else if (daysRemaining === 0) {
        // Today - notify in morning
        shouldNotify = true;
      } else if (daysRemaining <= 3 && preferences.threeDayRemindersEnabled) {
        // 3-day reminder - notify once when crossing threshold
        shouldNotify = true;
      }

      if (shouldNotify) {
        const notificationId = await scheduleDeadlineNotification(
          transaction,
          deadline,
          daysRemaining
        );

        if (notificationId) {
          notifications.push({
            id: notificationId,
            title:
              daysRemaining < 0
                ? "⚠️ OVERDUE Deadline"
                : daysRemaining === 0
                  ? "🔔 Deadline TODAY"
                  : `📅 ${daysRemaining} Day Reminder`,
            body: `${deadline.label} for ${transaction.address}`,
            timestamp: now.toISOString(),
            type: daysRemaining < 0 ? "overdue" : "reminder",
            transactionId: transaction.id,
            deadlineId: deadline.id,
          });
        }
      }
    }
  }

  return notifications;
}

/**
 * Generate and send daily digest notification
 */
export async function sendDailyDigest(
  transactions: Transaction[],
  preferences: NotificationPreferences
): Promise<NotificationHistoryItem | null> {
  if (!preferences.dailyDigestEnabled) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Collect all deadlines happening today or within next 3 days
    const upcomingDeadlines: Array<{
      transaction: Transaction;
      deadline: Deadline;
      daysRemaining: number;
    }> = [];

    for (const transaction of transactions) {
      if (transaction.status !== "active") continue;

      for (const deadline of transaction.deadlines) {
        if (deadline.status === "completed") continue;

        const daysRemaining = calculateDaysRemaining(deadline.date);
        if (daysRemaining >= 0 && daysRemaining <= 3) {
          upcomingDeadlines.push({ transaction, deadline, daysRemaining });
        }
      }
    }

    if (upcomingDeadlines.length === 0) {
      // No upcoming deadlines
      return null;
    }

    // Sort by days remaining
    upcomingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const title = "☀️ Good Morning - Daily Digest";
    const todayCount = upcomingDeadlines.filter((d) => d.daysRemaining === 0).length;
    const upcomingCount = upcomingDeadlines.filter((d) => d.daysRemaining > 0).length;

    let body = "";
    if (todayCount > 0 && upcomingCount > 0) {
      body = `${todayCount} deadline${todayCount > 1 ? "s" : ""} today, ${upcomingCount} upcoming`;
    } else if (todayCount > 0) {
      body = `${todayCount} deadline${todayCount > 1 ? "s" : ""} due today`;
    } else {
      body = `${upcomingCount} deadline${upcomingCount > 1 ? "s" : ""} in the next 3 days`;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: "digest",
          count: upcomingDeadlines.length,
        },
        sound: true,
      },
      trigger: null,
    });

    return {
      id: identifier,
      title,
      body,
      timestamp: new Date().toISOString(),
      type: "digest",
    };
  } catch (error) {
    console.error("Failed to send daily digest:", error);
    return null;
  }
}

/**
 * Schedule daily digest for specific time
 */
export async function scheduleDailyDigest(
  hour: number,
  minute: number
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Cancel existing daily digest notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.type === "daily-digest-scheduled") {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }

    // Schedule new daily digest
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Daily Digest",
        body: "Check your deadlines for today",
        data: { type: "daily-digest-scheduled" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      } as Notifications.DailyTriggerInput,
    });

    return identifier;
  } catch (error) {
    console.error("Failed to schedule daily digest:", error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get badge count (number of overdue + today deadlines)
 */
export async function updateBadgeCount(transactions: Transaction[]): Promise<void> {
  let count = 0;

  for (const transaction of transactions) {
    if (transaction.status !== "active") continue;

    for (const deadline of transaction.deadlines) {
      if (deadline.status === "completed") continue;

      const daysRemaining = calculateDaysRemaining(deadline.date);
      if (daysRemaining <= 0) {
        count++;
      }
    }
  }

  await Notifications.setBadgeCountAsync(count);
}
