import { CalendarEvent } from '../types';

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
  return events
    .map((event) => {
      const stage = getNotificationStage(event, now);
      if (!stage) return null;
      const notificationKey = `${event.id}:${stage}`;
      return {
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
      } satisfies CalendarNotificationItem;
    })
    .filter((item): item is CalendarNotificationItem => Boolean(item))
    .sort((a, b) => {
      const stageRank: Record<CalendarNotificationStage, number> = {
        overdue: 0,
        today: 1,
        tomorrow: 2,
        soon: 3,
      };
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

export function createRecurringCalendarEvents(
  base: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt' | 'seriesId' | 'occurrenceIndex'>,
  occurrences: number,
  recurrenceMonths: number
): CalendarEvent[] {
  const safeOccurrences = Math.max(1, Math.min(24, Math.floor(occurrences || 1)));
  const safeMonths = Math.max(1, Math.min(36, Math.floor(recurrenceMonths || 1)));
  const seriesId = `series-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();

  return Array.from({ length: safeOccurrences }, (_, index) => {
    const start = addMonthsKeepingDay(base.startAt, safeMonths * index);
    const end = base.endAt ? addMonthsKeepingDay(base.endAt, safeMonths * index) : undefined;
    return {
      ...base,
      id: crypto.randomUUID(),
      seriesId,
      occurrenceIndex: index + 1,
      recurrenceMonths: safeMonths,
      startAt: start.toISOString(),
      endAt: end?.toISOString(),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  });
}
