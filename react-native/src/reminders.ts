import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const MESSAGES = [
  'Time for your SITREP. One minute, then you’re done for the day.',
  'How did today go? Log it while it’s fresh.',
  'Quick check-in: rate today and note anything that got in the way.',
];

/** Schedule one daily reminder at hour:minute. Returns false if the user hasn't allowed notifications. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily', { name: 'Daily check-in', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'SITREP', body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)] },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'daily' },
  });
  return true;
}

export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
