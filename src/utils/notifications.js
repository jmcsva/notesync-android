import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

export async function scheduleTaskReminder({ taskId, title, dueDate, dueTime, repeat }) {
  const granted = await requestPermissions();
  if (!granted) return null;

  // Cancel existing notification for this task
  await cancelTaskReminder(taskId);

  if (!dueDate) return null;

  const [year, month, day] = dueDate.split('-').map(Number);
  const [hour, minute] = (dueTime || '09:00').split(':').map(Number);

  const triggerDate = new Date(year, month - 1, day, hour, minute, 0);
  if (triggerDate <= new Date()) return null;

  let trigger;
  if (repeat === 'none' || !repeat) {
    trigger = triggerDate;
  } else if (repeat === 'daily') {
    trigger = { hour, minute, repeats: true };
  } else if (repeat === 'weekly') {
    trigger = { weekday: triggerDate.getDay() + 1, hour, minute, repeats: true };
  } else if (repeat === 'monthly') {
    // Expo doesn't support monthly natively; schedule for the day each month
    trigger = triggerDate; // will re-schedule after firing
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `⏰ ${title}`,
      body: `Task reminder — tap to open NoteSync`,
      data: { taskId },
      sound: 'default',
    },
    trigger,
  });

  return id;
}

export async function cancelTaskReminder(taskId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationListener(handler) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
