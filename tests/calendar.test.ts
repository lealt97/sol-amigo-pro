import assert from 'node:assert/strict';
import test from 'node:test';
import { CalendarEvent } from '../src/types';
import {
  addMonthsKeepingDay,
  buildCalendarNotifications,
  compareCalendarEvents,
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


test('série quinzenal cria visitas a cada 15 dias', () => {
  const { id, createdAt, updatedAt, ...seriesBase } = baseEvent;
  const series = createRecurringCalendarEvents(
    seriesBase,
    4,
    { interval: 15, unit: 'days' }
  );

  assert.equal(series.length, 4);
  assert.equal(series[0].recurrenceInterval, 15);
  assert.equal(series[0].recurrenceUnit, 'days');

  const dates = series.map((item) => new Date(item.startAt).toISOString().slice(0, 10));
  assert.deepEqual(dates, [
    '2026-10-01',
    '2026-10-16',
    '2026-10-31',
    '2026-11-15',
  ]);
});


test('mesma data e mesma prioridade preserva a ordem de criação', () => {
  const events: CalendarEvent[] = [
    {
      ...baseEvent,
      id: 'created-later',
      startAt: '2026-10-10T09:00:00.000Z',
      priority: 'Média',
      createdAt: '2026-10-02T12:00:00.000Z',
    },
    {
      ...baseEvent,
      id: 'created-first',
      startAt: '2026-10-10T16:00:00.000Z',
      priority: 'Média',
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  ];

  const sorted = [...events].sort(compareCalendarEvents);
  assert.deepEqual(sorted.map((event) => event.id), ['created-first', 'created-later']);
});

test('na mesma data a prioridade vem antes da ordem de criação', () => {
  const events: CalendarEvent[] = [
    {
      ...baseEvent,
      id: 'low-created-first',
      startAt: '2026-10-10T08:00:00.000Z',
      priority: 'Baixa',
      createdAt: '2026-09-20T12:00:00.000Z',
    },
    {
      ...baseEvent,
      id: 'high-created-later',
      startAt: '2026-10-10T18:00:00.000Z',
      priority: 'Alta',
      createdAt: '2026-10-02T12:00:00.000Z',
    },
    {
      ...baseEvent,
      id: 'medium',
      startAt: '2026-10-10T10:00:00.000Z',
      priority: 'Média',
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  ];

  const sorted = [...events].sort(compareCalendarEvents);
  assert.deepEqual(sorted.map((event) => event.id), [
    'high-created-later',
    'medium',
    'low-created-first',
  ]);
});

test('datas diferentes continuam em ordem cronológica por dia', () => {
  const events: CalendarEvent[] = [
    {
      ...baseEvent,
      id: 'tomorrow-high',
      startAt: '2026-10-11T08:00:00.000Z',
      priority: 'Alta',
      createdAt: '2026-09-01T12:00:00.000Z',
    },
    {
      ...baseEvent,
      id: 'today-low',
      startAt: '2026-10-10T18:00:00.000Z',
      priority: 'Baixa',
      createdAt: '2026-10-02T12:00:00.000Z',
    },
  ];

  const sorted = [...events].sort(compareCalendarEvents);
  assert.deepEqual(sorted.map((event) => event.id), ['today-low', 'tomorrow-high']);
});
