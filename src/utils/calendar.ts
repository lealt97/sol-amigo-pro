import { CalendarEvent, MaintenanceFrequencyUnit } from '../types';

export type CalendarNotificationStage = 'overdue' | 'today' | 'tomorrow' | 'soon';

export interface CalendarNotificationItem {
  id: string;
  eventId: string;
  notificationKey: string;
  title: string;
  clientName?: string;
  eventType: CalendarEvent['type'];
  startAt: string;
  stage: CalendarNotificationStage;
  label: string;
  read: boolean;
}

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export function daysUntil(dateInput: string | Date, now = new Date()): number {
  const target = startOfDay(typeof dateInput === 'string' ? new Date(dateInput) : dateInput);
  const base = startOfDay(now);
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export function getNotificationStage(event: CalendarEvent, now = new Date()): CalendarNotificationStage | null {
  if (event.status === 'Concluído' || event.status === 'Cancelado') return null;
  const diff = daysUntil(event.startAt, now);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff <= 7) return 'soon';
  return null;
}

export function notificationLabel(stage: CalendarNotificationStage, startAt: string): string {
  const date = new Date(startAt);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (stage === 'overdue') return 'Evento atrasado';
  if (stage === 'today') return `Hoje às ${time}`;
  if (stage === 'tomorrow') return `Amanhã às ${time}`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function buildCalendarNotifications(
  events: CalendarEvent[],
  readKeys: Set<string>,
  now = new Date()
): CalendarNotificationItem[] {
  const items: CalendarNotificationItem[] = [];

  events.forEach((event) => {
    const stage = getNotificationStage(event, now);
    if (!stage) return;

    const notificationKey = `${event.id}:${stage}`;
    items.push({
      id: notificationKey,
      eventId: event.id,
      notificationKey,
      title: event.title,
      clientName: event.clientName,
      eventType: event.type,
      startAt: event.startAt,
      stage,
      label: notificationLabel(stage, event.startAt),
      read: readKeys.has(notificationKey),
    });
  });

  const stageRank: Record<CalendarNotificationStage, number> = {
    overdue: 0,
    today: 1,
    tomorrow: 2,
    soon: 3,
  };

  return items.sort((a, b) => {
    const rankDiff = stageRank[a.stage] - stageRank[b.stage];
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  });
}

export function addMonthsKeepingDay(dateInput: string | Date, months: number): Date {
  const source = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  const day = source.getDate();
  const result = new Date(source);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export interface CalendarRecurrence {
  interval: number;
  unit: MaintenanceFrequencyUnit;
}

export function addCalendarRecurrence(
  dateInput: string | Date,
  intervalInput: number,
  unit: MaintenanceFrequencyUnit
): Date {
  const interval = Math.max(1, Math.floor(Number(intervalInput) || 1));
  if (unit === 'months') return addMonthsKeepingDay(dateInput, interval);

  const result = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  result.setDate(result.getDate() + interval * (unit === 'weeks' ? 7 : 1));
  return result;
}

export function createRecurringCalendarEvents(
  base: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'seriesId' | 'occurrenceIndex'>,
  occurrences: number,
  recurrenceInput: number | CalendarRecurrence
): CalendarEvent[] {
  const safeOccurrences = Math.max(1, Math.min(160, Math.floor(occurrences || 1)));
  const recurrence: CalendarRecurrence = typeof recurrenceInput === 'number'
    ? { interval: Math.max(1, Math.min(36, Math.floor(recurrenceInput || 1))), unit: 'months' }
    : {
        interval: Math.max(1, Math.min(365, Math.floor(recurrenceInput.interval || 1))),
        unit: recurrenceInput.unit || 'months',
      };
  const seriesId = `series-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  return Array.from({ length: safeOccurrences }, (_, index) => {
    const offset = recurrence.interval * index;
    const start = index === 0
      ? new Date(base.startAt)
      : addCalendarRecurrence(base.startAt, offset, recurrence.unit);
    const end = base.endAt
      ? (index === 0 ? new Date(base.endAt) : addCalendarRecurrence(base.endAt, offset, recurrence.unit))
      : undefined;

    return {
      ...base,
      id: crypto.randomUUID(),
      seriesId,
      occurrenceIndex: index + 1,
      recurrenceInterval: recurrence.interval,
      recurrenceUnit: recurrence.unit,
      recurrenceMonths: recurrence.unit === 'months' ? recurrence.interval : base.recurrenceMonths,
      startAt: start.toISOString(),
      endAt: end?.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}
