import { accountStorage, saveWorkspace } from '../platform/workspace/workspace';
import { CalendarEvent } from '../types';

export const CALENDAR_EVENTS_UPDATED_EVENT = 'solamigo:calendar-events-updated';
const STORAGE_KEY = 'solamigo.calendar-events.v1';
const STORAGE_PREFIX = 'solamigo.calendar-events.v1';

const normalizeEvent = (value: Partial<CalendarEvent>): CalendarEvent => {
  const now = new Date().toISOString();
  return {
    id: value.id || crypto.randomUUID(),
    userId: value.userId,
    seriesId: value.seriesId,
    occurrenceIndex: value.occurrenceIndex,
    title: String(value.title || 'Evento').trim(),
    type: value.type || 'Outro',
    startAt: value.startAt || now,
    endAt: value.endAt,
    allDay: Boolean(value.allDay),
    status: value.status || 'Agendado',
    priority: value.priority || 'Média',
    clientId: value.clientId,
    clientName: value.clientName,
    proposalCode: value.proposalCode,
    maintenancePlanId: value.maintenancePlanId,
    maintenancePlanName: value.maintenancePlanName,
    recurrenceMonths: value.recurrenceMonths,
    recurrenceInterval: value.recurrenceInterval,
    recurrenceUnit: value.recurrenceUnit,
    location: value.location,
    description: value.description,
    createdAt: value.createdAt || now,
    updatedAt: value.updatedAt || now,
  };
};

export function getLocalEvents(): CalendarEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const map = new Map<string, CalendarEvent>();

    // 1. Read main storage key
    const rawMain = accountStorage.getItem(STORAGE_KEY);
    if (rawMain) {
      try {
        const parsed = JSON.parse(rawMain);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            const ev = normalizeEvent(item);
            if (ev.id) map.set(ev.id, ev);
          });
        }
      } catch {}
    }

    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function saveLocalEvents(events: CalendarEvent[], emitEvent = true): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized = events.map(normalizeEvent);
    accountStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(CALENDAR_EVENTS_UPDATED_EVENT, { detail: normalized }));
    }
  } catch {
    // local persistence fallback
  }
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return getLocalEvents(); // Hydrated from the owner-scoped server workspace before rendering.
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  if (!event.title.trim() || !Number.isFinite(Date.parse(event.startAt))) throw new Error('Informe título e data válidos.');
  const normalized = normalizeEvent({ ...event, updatedAt: new Date().toISOString() });
  const local = getLocalEvents();
  saveLocalEvents(local.some(item => item.id === normalized.id)
    ? local.map(item => item.id === normalized.id ? normalized : item) : [...local, normalized]);
  await saveWorkspace();
  return normalized;
}

export async function saveCalendarEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  const next = new Map(getLocalEvents().map(item => [item.id, item]));
  const normalized = events.map(normalizeEvent);
  for (const event of normalized) {
    if (!event.title.trim() || !Number.isFinite(Date.parse(event.startAt))) throw new Error('Informe título e data válidos.');
    next.set(event.id, event);
  }
  saveLocalEvents([...next.values()]);
  await saveWorkspace();
  return normalized;
}

export async function deleteCalendarEvent(eventId: string, deleteSeries = false): Promise<void> {
  const local = getLocalEvents();
  const target = local.find(item => item.id === eventId);
  saveLocalEvents(local.filter(item => deleteSeries && target?.seriesId ? item.seriesId !== target.seriesId : item.id !== eventId));
  await saveWorkspace();
}

export async function updateCalendarEventStatus(eventId: string, status: CalendarEvent['status']): Promise<CalendarEvent | null> {
  const event = getLocalEvents().find(item => item.id === eventId);
  return event ? saveCalendarEvent({ ...event, status, updatedAt: new Date().toISOString() }) : null;
}
