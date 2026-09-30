import assert from 'node:assert/strict';
import test from 'node:test';
import { CalendarEvent } from '../src/types';
import {
  addMonthsKeepingDay,
  buildCalendarNotifications,
  createRecurringCalendarEvents,
} from '../src/utils/calendar';

const baseEvent: CalendarEvent = {
  id: 'event-1',
  title: 'Manutenção preventiva',
  type: 'Manutenção',
  startAt: '2026-10-01T12:00:00.000Z',
  allDay: false,
  status: 'Agendado',
  priority: 'Média',
  clientName: 'Cliente Teste',
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
};

test('alerta do calendário classifica hoje, amanhã, próximos dias e atraso', () => {
  const now = new Date('2026-09-29T12:00:00.000Z');
  const events: CalendarEvent[] = [
    { ...baseEvent, id: 'overdue', startAt: '2026-09-28T12:00:00.000Z' },
    { ...baseEvent, id: 'today', startAt: '2026-09-29T15:00:00.000Z' },
    { ...baseEvent, id: 'tomorrow', startAt: '2026-09-30T15:00:00.000Z' },
    { ...baseEvent, id: 'soon', startAt: '2026-10-04T15:00:00.000Z' },
    { ...baseEvent, id: 'later', startAt: '2026-10-20T15:00:00.000Z' },
  ];

  const result = buildCalendarNotifications(events, new Set(), now);
  assert.deepEqual(result.map((item) => [item.eventId, item.stage]), [
    ['overdue', 'overdue'],
    ['today', 'today'],
    ['tomorrow', 'tomorrow'],
    ['soon', 'soon'],
  ]);
});

test('evento concluído ou cancelado não gera notificação', () => {
  const now = new Date('2026-09-29T12:00:00.000Z');
  const result = buildCalendarNotifications([
    { ...baseEvent, id: 'done', status: 'Concluído', startAt: '2026-09-29T15:00:00.000Z' },
    { ...baseEvent, id: 'cancelled', status: 'Cancelado', startAt: '2026-09-29T15:00:00.000Z' },
  ], new Set(), now);

  assert.equal(result.length, 0);
});

test('recorrência mensal preserva o dia quando possível', () => {
  const result = addMonthsKeepingDay('2026-01-31T12:00:00.000Z', 1);
  assert.equal(result.getMonth(), 1);
  assert.equal(result.getDate(), 28);
});

test('série de manutenção usa o intervalo configurado no plano', () => {
  const { id, createdAt, updatedAt, ...seriesBase } = baseEvent;
  const series = createRecurringCalendarEvents(seriesBase, 4, 6);

  assert.equal(series.length, 4);
  assert.equal(series[0].occurrenceIndex, 1);
  assert.equal(series[3].occurrenceIndex, 4);
  assert.equal(series[0].seriesId, series[3].seriesId);
  assert.equal(new Date(series[1].startAt).getMonth(), 3);
  assert.equal(new Date(series[2].startAt).getMonth(), 9);
});
