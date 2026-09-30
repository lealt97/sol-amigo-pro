import { CalendarNotificationItem, buildCalendarNotifications } from '../utils/calendar';
import { CALENDAR_EVENTS_UPDATED_EVENT, fetchCalendarEvents } from './calendarEvents';

const STORAGE_READ_KEY = 'solamigo.calendar-notifications.read.v1';

type Listener = (items: CalendarNotificationItem[], unreadCount: number) => void;

const listeners = new Set<Listener>();
let currentItems: CalendarNotificationItem[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

function getReadKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveReadKeys(keys: Set<string>) {
  try {
    localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(Array.from(keys)));
  } catch {
    // non-blocking
  }
}

function notify() {
  const unread = currentItems.filter((item) => !item.read).length;
  listeners.forEach((listener) => {
    try {
      listener([...currentItems], unread);
    } catch {
      // listener errors must not break the notification service
    }
  });
}

export async function refreshCalendarNotifications(): Promise<void> {
  const events = await fetchCalendarEvents();
  currentItems = buildCalendarNotifications(events, getReadKeys(), new Date());
  notify();
}

export function markCalendarNotificationAsRead(notificationKey: string) {
  const keys = getReadKeys();
  keys.add(notificationKey);
  saveReadKeys(keys);
  currentItems = currentItems.map((item) =>
    item.notificationKey === notificationKey ? { ...item, read: true } : item
  );
  notify();
}

export function markAllCalendarNotificationsAsRead() {
  const keys = getReadKeys();
  currentItems.forEach((item) => keys.add(item.notificationKey));
  saveReadKeys(keys);
  currentItems = currentItems.map((item) => ({ ...item, read: true }));
  notify();
}

export function subscribeToCalendarNotifications(listener: Listener): () => void {
  listeners.add(listener);
  listener([...currentItems], currentItems.filter((item) => !item.read).length);
  startCalendarNotificationService();

  return () => {
    listeners.delete(listener);
  };
}

function startCalendarNotificationService() {
  if (started) return;
  started = true;
  void refreshCalendarNotifications();

  const handleChange = () => void refreshCalendarNotifications();
  window.addEventListener(CALENDAR_EVENTS_UPDATED_EVENT, handleChange);
  window.addEventListener('focus', handleChange);

  pollTimer = setInterval(() => {
    void refreshCalendarNotifications();
  }, 60000);
}

export function stopCalendarNotificationServiceForTests() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  started = false;
}
