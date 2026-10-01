import { supabase } from '../lib/supabase';
import { CalendarEvent } from '../types';

export const CALENDAR_EVENTS_UPDATED_EVENT = 'solamigo:calendar-events-updated';
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

async function getStorageKey(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    return `${STORAGE_PREFIX}:${data.user?.id || 'anonymous'}`;
  } catch {
    return `${STORAGE_PREFIX}:anonymous`;
  }
}

async function getLocalEvents(): Promise<CalendarEvent[]> {
  if (typeof window === 'undefined') return [];
  try {
    const key = await getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeEvent) : [];
  } catch {
    return [];
  }
}

async function saveLocalEvents(events: CalendarEvent[], emitEvent = true): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const key = await getStorageKey();
    localStorage.setItem(key, JSON.stringify(events.map(normalizeEvent)));
    if (emitEvent) {
      window.dispatchEvent(new CustomEvent(CALENDAR_EVENTS_UPDATED_EVENT, { detail: events }));
    }
  } catch {
    // local persistence is only a fallback
  }
}

const mapRow = (row: any): CalendarEvent => normalizeEvent({
  id: row.id,
  userId: row.user_id,
  seriesId: row.series_id,
  occurrenceIndex: row.occurrence_index,
  title: row.title,
  type: row.event_type,
  startAt: row.start_at,
  endAt: row.end_at,
  allDay: row.all_day,
  status: row.status,
  priority: row.priority,
  clientId: row.client_id,
  clientName: row.client_name,
  proposalCode: row.proposal_code,
  maintenancePlanId: row.maintenance_plan_id,
  maintenancePlanName: row.maintenance_plan_name,
  recurrenceMonths: row.recurrence_months,
  recurrenceInterval: row.recurrence_interval,
  recurrenceUnit: row.recurrence_unit,
  location: row.location,
  description: row.description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRow = (event: CalendarEvent, userId: string) => ({
  id: event.id,
  user_id: userId,
  series_id: event.seriesId || null,
  occurrence_index: event.occurrenceIndex || null,
  title: event.title,
  event_type: event.type,
  start_at: event.startAt,
  end_at: event.endAt || null,
  all_day: event.allDay,
  status: event.status,
  priority: event.priority,
  client_id: event.clientId || null,
  client_name: event.clientName || null,
  proposal_code: event.proposalCode || null,
  maintenance_plan_id: event.maintenancePlanId || null,
  maintenance_plan_name: event.maintenancePlanName || null,
  recurrence_months: event.recurrenceMonths || null,
  recurrence_interval: event.recurrenceInterval || null,
  recurrence_unit: event.recurrenceUnit || null,
  location: event.location || null,
  description: event.description || null,
});

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const local = await getLocalEvents();
  try {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_at', { ascending: true });

    if (error || !Array.isArray(data)) return local;

    const remote = data.map(mapRow);
    await saveLocalEvents(remote, false);
    return remote;
  } catch {
    return local;
  }
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<CalendarEvent> {
  const normalized = normalizeEvent({ ...event, updatedAt: new Date().toISOString() });
  const local = await getLocalEvents();
  const next = local.some((item) => item.id === normalized.id)
    ? local.map((item) => item.id === normalized.id ? normalized : item)
    : [...local, normalized];
  await saveLocalEvents(next);

  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return normalized;
    const { data, error } = await supabase
      .from('calendar_events')
      .upsert(toRow(normalized, userId), { onConflict: 'id' })
      .select('*')
      .single();

    if (!error && data) {
      const saved = mapRow(data);
      const refreshed = next.map((item) => item.id === saved.id ? saved : item);
      await saveLocalEvents(refreshed);
      return saved;
    }
  } catch {
    // local fallback already saved
  }

  return normalized;
}

export async function saveCalendarEvents(events: CalendarEvent[]): Promise<CalendarEvent[]> {
  const saved: CalendarEvent[] = [];
  for (const event of events) saved.push(await saveCalendarEvent(event));
  return saved;
}

export async function deleteCalendarEvent(eventId: string, deleteSeries = false): Promise<void> {
  const local = await getLocalEvents();
  const target = local.find((item) => item.id === eventId);
  const ids = deleteSeries && target?.seriesId
    ? local.filter((item) => item.seriesId === target.seriesId).map((item) => item.id)
    : [eventId];
  const next = local.filter((item) => !ids.includes(item.id));
  await saveLocalEvents(next);

  try {
    let query = supabase.from('calendar_events').delete();
    if (deleteSeries && target?.seriesId) query = query.eq('series_id', target.seriesId);
    else query = query.eq('id', eventId);
    await query;
  } catch {
    // local fallback already applied
  }
}

export async function updateCalendarEventStatus(
  eventId: string,
  status: CalendarEvent['status']
): Promise<CalendarEvent | null> {
  const events = await fetchCalendarEvents();
  const event = events.find((item) => item.id === eventId);
  if (!event) return null;
  return saveCalendarEvent({ ...event, status, updatedAt: new Date().toISOString() });
}
