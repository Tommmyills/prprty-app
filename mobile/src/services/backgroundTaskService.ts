/**
 * Background Task Service
 * Periodic deadline checking and notification scheduling
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Transaction, NotificationPreferences } from "../state/realtorStore";
import {
  checkDeadlinesAndNotify,
  sendDailyDigest,
  updateBadgeCount,
} from "./notificationService";

const BACKGROUND_DEADLINE_CHECK_TASK = "background-deadline-check";

/**
 * Define the background task that runs periodically
 */
TaskManager.defineTask(BACKGROUND_DEADLINE_CHECK_TASK, async () => {
  try {
    console.log("[Background Task] Starting deadline check...");

    // Load state from AsyncStorage
    const stateJson = await AsyncStorage.getItem("realtor-storage");
    if (!stateJson) {
      console.log("[Background Task] No state found");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const state = JSON.parse(stateJson);
    const transactions: Transaction[] = state.state?.transactions || [];
    const preferences: NotificationPreferences = state.state?.notificationPreferences || {
      dailyDigestEnabled: true,
      threeDayRemindersEnabled: true,
      overdueAlertsEnabled: true,
      dailyDigestTime: "08:00",
    };
    const lastChecked = state.state?.lastNotificationCheck
      ? new Date(state.state.lastNotificationCheck)
      : new Date(0);

    // Update badge count
    await updateBadgeCount(transactions);

    // Check deadlines and send notifications
    const notifications = await checkDeadlinesAndNotify(
      transactions,
      preferences,
      lastChecked
    );

    console.log(`[Background Task] Sent ${notifications.length} notifications`);

    // Check if it is time for daily digest
    const now = new Date();
    const [digestHour, digestMinute] = preferences.dailyDigestTime.split(":").map(Number);
    const isDigestTime =
      now.getHours() === digestHour &&
      now.getMinutes() >= digestMinute &&
      now.getMinutes() < digestMinute + 60; // Within 1 hour window

    if (preferences.dailyDigestEnabled && isDigestTime) {
      // Check if we already sent digest today
      const lastDigestDate = state.state?.lastDigestSent
        ? new Date(state.state.lastDigestSent).toDateString()
        : null;
      const todayDate = now.toDateString();

      if (lastDigestDate !== todayDate) {
        const digestNotification = await sendDailyDigest(transactions, preferences);
        if (digestNotification) {
          console.log("[Background Task] Sent daily digest");
          notifications.push(digestNotification);

          // Update lastDigestSent
          state.state.lastDigestSent = now.toISOString();
        }
      }
    }

    // Update notification history and last check time in AsyncStorage
    if (notifications.length > 0) {
      const existingHistory = state.state?.notificationHistory || [];
      state.state.notificationHistory = [...notifications, ...existingHistory].slice(0, 25);
    }
    state.state.lastNotificationCheck = now.toISOString();

    await AsyncStorage.setItem("realtor-storage", JSON.stringify(state));

    console.log("[Background Task] Completed successfully");
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[Background Task] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background task
 */
export async function registerBackgroundTask(): Promise<boolean> {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_DEADLINE_CHECK_TASK
    );

    if (isRegistered) {
      console.log("[Background Task] Already registered");
      return true;
    }

    // Register the task
    await BackgroundFetch.registerTaskAsync(BACKGROUND_DEADLINE_CHECK_TASK, {
      minimumInterval: 60 * 60, // 1 hour in seconds
      stopOnTerminate: false, // Continue after app is closed
      startOnBoot: true, // Start when device boots
    });

    console.log("[Background Task] Registered successfully");
    return true;
  } catch (error) {
    console.error("[Background Task] Registration failed:", error);
    return false;
  }
}

/**
 * Unregister the background task
 */
export async function unregisterBackgroundTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_DEADLINE_CHECK_TASK
    );

    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_DEADLINE_CHECK_TASK);
      console.log("[Background Task] Unregistered successfully");
    }
  } catch (error) {
    console.error("[Background Task] Unregistration failed:", error);
  }
}

/**
 * Get background task status
 */
export async function getBackgroundTaskStatus(): Promise<{
  isRegistered: boolean;
  status?: BackgroundFetch.BackgroundFetchStatus;
}> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_DEADLINE_CHECK_TASK
    );
    const status = await BackgroundFetch.getStatusAsync();

    return {
      isRegistered,
      status: status ?? undefined,
    };
  } catch (error) {
    console.error("[Background Task] Status check failed:", error);
    return { isRegistered: false };
  }
}

/**
 * Manually trigger the background task (for testing)
 */
export async function triggerBackgroundTaskNow(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_DEADLINE_CHECK_TASK
    );

    if (!isRegistered) {
      console.log("[Background Task] Not registered, registering now...");
      await registerBackgroundTask();
    }

    // Trigger task manually by setting a very short interval
    await BackgroundFetch.setMinimumIntervalAsync(1); // 1 second
    console.log("[Background Task] Triggered manually");
  } catch (error) {
    console.error("[Background Task] Manual trigger failed:", error);
  }
}
