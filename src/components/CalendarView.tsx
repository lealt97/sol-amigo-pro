import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { CalendarEvent, CalendarEventPriority, CalendarEventStatus, CalendarEventType, ThemeConfig } from '../types';
import {
  deleteCalendarEvent,
  fetchCalendarEvents,
  saveCalendarEvent,
  saveCalendarEvents,
} from '../services/calendarEvents';
import { ClientProposal, fetchAllClientProposals } from '../services/proposals';
import { createRecurringCalendarEvents } from '../utils/calendar';
import { formatMaintenanceFrequency, getMaintenanceFrequency } from '../utils/maintenance';

interface CalendarViewProps {
  theme: ThemeConfig;
  onShowToast?: (message: string) => void;
}

type CalendarMode = 'month' | 'list';

const EVENT_TYPES: CalendarEventType[] = [
  'Manutenção',
  'Instalação',
  'Vistoria',
  'Visita Técnica',
  'Homologação',
  'Reunião Comercial',
  'Outro',
];

const STATUS_OPTIONS: CalendarEventStatus[] = ['Agendado', 'Em andamento', 'Concluído', 'Cancelado'];
const PRIORITIES: CalendarEventPriority[] = ['Alta', 'Média', 'Baixa'];

const pad = (value: number) => String(value).padStart(2, '0');

const toLocalInputValue = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const eventAccent = (type: CalendarEventType) => {
  switch (type) {
    case 'Manutenção': return '#10b981';
    case 'Instalação': return '#3b82f6';
    case 'Vistoria': return '#8b5cf6';
    case 'Visita Técnica': return '#f59e0b';
    case 'Homologação': return '#06b6d4';
    case 'Reunião Comercial': return '#ec4899';
    default: return '#94a3b8';
  }
};

const newDraft = (): CalendarEvent => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return {
    id: crypto.randomUUID(),
    title: '',
    type: 'Manutenção',
    startAt: start.toISOString(),
    allDay: false,
    status: 'Agendado',
    priority: 'Média',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const CalendarView: React.FC<CalendarViewProps> = ({ theme, onShowToast }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent>(newDraft());
  const [isExisting, setIsExisting] = useState(false);
  const [repeatPlan, setRepeatPlan] = useState(true);

  const reload = async () => {
    const [eventList, proposalList] = await Promise.all([
      fetchCalendarEvents(),
      fetchAllClientProposals().catch(() => []),
    ]);
    setEvents(eventList);
    setProposals(proposalList);
  };

  useEffect(() => {
    void reload();
    const handleUpdate = () => void reload();
    window.addEventListener('solamigo:calendar-events-updated', handleUpdate);
    return () => window.removeEventListener('solamigo:calendar-events-updated', handleUpdate);
  }, []);

  const proposalWithPlan = useMemo(
    () => proposals.filter((proposal) => proposal.maintenancePlan?.enabled),
    [proposals]
  );

  const selectedProposal = useMemo(
    () => proposals.find((proposal) => proposal.code === editing.proposalCode),
    [proposals, editing.proposalCode]
  );

  const visibleEvents = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('pt-BR');
    return events
      .filter((event) => event.status !== 'Cancelado')
      .filter((event) => {
        if (!q) return true;
        return [event.title, event.clientName, event.proposalCode, event.type, event.location, event.maintenancePlanName]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(q));
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, search]);

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      const dayEvents = visibleEvents.filter((event) => {
        const date = new Date(event.startAt);
        return date.getFullYear() === day.getFullYear()
          && date.getMonth() === day.getMonth()
          && date.getDate() === day.getDate();
      });
      return { day, events: dayEvents, currentMonth: day.getMonth() === month };
    });
  }, [cursor, visibleEvents]);

  const orderedListEvents = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return visibleEvents
      .filter((event) => new Date(event.startAt).getTime() >= start.getTime())
      .sort((a, b) => {
        const byDate = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        if (byDate !== 0) return byDate;

        const priorityRank: Record<CalendarEventPriority, number> = {
          Alta: 0,
          Média: 1,
          Baixa: 2,
        };
        return priorityRank[a.priority] - priorityRank[b.priority];
      })
      .slice(0, 80);
  }, [visibleEvents]);

  const openNew = (date?: Date) => {
    const draft = newDraft();
    if (date) {
      const start = new Date(date);
      start.setHours(9, 0, 0, 0);
      draft.startAt = start.toISOString();
    }
    setEditing(draft);
    setIsExisting(false);
    setRepeatPlan(true);
    setEditorOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing({ ...event });
    setIsExisting(true);
    setRepeatPlan(false);
    setEditorOpen(true);
  };

  const applyProposal = (code: string) => {
    const proposal = proposals.find((item) => item.code === code);
    if (!proposal) {
      setEditing((current) => ({
        ...current,
        proposalCode: undefined,
        clientId: undefined,
        clientName: undefined,
        maintenancePlanId: undefined,
        maintenancePlanName: undefined,
        recurrenceMonths: undefined,
        recurrenceInterval: undefined,
        recurrenceUnit: undefined,
      }));
      return;
    }
    const plan = proposal.maintenancePlan;
    const frequency = plan?.enabled ? getMaintenanceFrequency(plan) : null;
    setEditing((current) => ({
      ...current,
      proposalCode: proposal.code,
      clientId: proposal.clientId,
      clientName: proposal.clientName,
      title: current.title || (plan?.enabled ? `Manutenção - ${proposal.clientName}` : `${current.type} - ${proposal.clientName}`),
      type: plan?.enabled ? 'Manutenção' : current.type,
      maintenancePlanId: plan?.enabled ? plan.id : undefined,
      maintenancePlanName: plan?.enabled ? plan.name : undefined,
      recurrenceMonths: plan?.enabled ? plan.frequencyMonths : undefined,
      recurrenceInterval: frequency?.interval,
      recurrenceUnit: frequency?.unit,
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing.title.trim()) return;

    const base: CalendarEvent = {
      ...editing,
      title: editing.title.trim(),
      updatedAt: new Date().toISOString(),
    };

    const plan = selectedProposal?.maintenancePlan;
    if (!isExisting && repeatPlan && base.type === 'Manutenção' && plan?.enabled) {
      const frequency = getMaintenanceFrequency(plan);
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, seriesId: _seriesId, occurrenceIndex: _occurrenceIndex, ...seriesBase } = base;
      const occurrences = Math.max(2, Math.min(160, (plan.visitsPerYear || 1) * 2));
      const series = createRecurringCalendarEvents(
        {
          ...seriesBase,
          recurrenceInterval: frequency.interval,
          recurrenceUnit: frequency.unit,
        },
        occurrences,
        frequency
      );
      await saveCalendarEvents(series);
      onShowToast?.(`${series.length} manutenções do plano foram adicionadas ao calendário.`);
    } else {
      await saveCalendarEvent(base);
      onShowToast?.(isExisting ? 'Evento atualizado.' : 'Evento adicionado ao calendário.');
    }

    setEditorOpen(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!isExisting) return;
    const deleteSeries = Boolean(editing.seriesId)
      && window.confirm('Este evento faz parte de uma série. OK para excluir toda a série ou Cancelar para excluir somente esta ocorrência?');
    await deleteCalendarEvent(editing.id, deleteSeries);
    setEditorOpen(false);
    onShowToast?.(deleteSeries ? 'Série removida do calendário.' : 'Evento removido.');
    await reload();
  };

  const monthTitle = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const today = new Date();

  return (
    <div id="calendario-page" className="space-y-5">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between" style={{ borderColor: theme.border }}>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--dim)]">Agenda operacional</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-[var(--text)]">
            <CalendarDays className="h-6 w-6" style={{ color: theme.secondary }} />
            Calendário
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Manutenções, instalações, vistorias, homologações, visitas e compromissos comerciais em uma única agenda. Eventos próximos também aparecem no sino de notificações.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold shadow-sm"
          style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
        >
          <Plus className="h-4 w-4" /> Novo evento
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Hoje', visibleEvents.filter((event) => {
            const date = new Date(event.startAt);
            return date.toDateString() === today.toDateString();
          }).length],
          ['Próximos 7 dias', visibleEvents.filter((event) => {
            const diff = Math.ceil((new Date(event.startAt).getTime() - today.getTime()) / 86400000);
            return diff >= 0 && diff <= 7;
          }).length],
          ['Manutenções', visibleEvents.filter((event) => event.type === 'Manutenção').length],
          ['Atrasados', visibleEvents.filter((event) => event.status !== 'Concluído' && new Date(event.startAt).getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()).length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
            <div className="text-xs font-bold text-[var(--muted)]">{String(label)}</div>
            <div className="mt-2 text-2xl font-black text-[var(--text)]">{String(value)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-4" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg border p-2" style={{ borderColor: theme.border }}><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => setCursor(new Date())} className="rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>Hoje</button>
            <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg border p-2" style={{ borderColor: theme.border }}><ChevronRight className="h-4 w-4" /></button>
            <span className="ml-1 text-sm font-black capitalize text-[var(--text)]">{monthTitle}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente, evento ou proposta..."
                className="h-10 w-full rounded-xl border bg-transparent pl-9 pr-3 text-xs outline-none"
                style={{ borderColor: theme.border, color: theme.text }}
              />
            </div>
            <div className="flex rounded-xl border p-1" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
              {(['month', 'list'] as CalendarMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold"
                  style={mode === item ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' } : {}}
                >
                  {item === 'month' ? 'Mês' : 'Lista'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mode === 'month' ? (
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
          <div className="grid grid-cols-7 border-b text-center text-[10px] font-bold uppercase text-[var(--muted)]" style={{ borderColor: theme.border }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day} className="p-2">{day}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {monthCells.map(({ day, events: dayEvents, currentMonth }) => {
              const isToday = day.toDateString() === today.toDateString();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onDoubleClick={() => openNew(day)}
                  className="min-h-[112px] border-b border-r p-2 text-left align-top transition-colors hover:bg-[color-mix(in_srgb,var(--secondary)_5%,transparent)]"
                  style={{ borderColor: theme.border, opacity: currentMonth ? 1 : 0.45 }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold"
                      style={isToday ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' } : {}}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length > 3 && <span className="text-[9px] text-[var(--muted)]">+{dayEvents.length - 3}</span>}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        role="button"
                        tabIndex={0}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          openEdit(event);
                        }}
                        className="truncate rounded-md border-l-2 px-1.5 py-1 text-[9px] font-bold"
                        style={{ borderLeftColor: eventAccent(event.type), backgroundColor: theme.background }}
                        title={`${event.title} — ${new Date(event.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        {event.allDay ? '' : `${new Date(event.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} `}
                        {event.title}
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="border-t px-4 py-2 text-[10px] text-[var(--muted)]" style={{ borderColor: theme.border }}>
            Dica: dê duplo clique em um dia para criar um evento naquela data.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orderedListEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center" style={{ borderColor: theme.border }}>
              <CalendarDays className="mx-auto h-8 w-8 text-[var(--muted)]" />
              <div className="mt-2 text-sm font-bold">Nenhum compromisso futuro</div>
            </div>
          ) : orderedListEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => openEdit(event)}
              className="flex w-full flex-col gap-3 rounded-2xl border p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              style={{ backgroundColor: theme.primary, borderColor: theme.border }}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-1 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: eventAccent(event.type) }} />
                <div className="min-w-0">
                  <div className="text-sm font-black text-[var(--text)]">{event.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--muted)]">
                    <span>{event.type}</span>
                    {event.clientName && <span>{event.clientName}</span>}
                    {event.proposalCode && <span>{event.proposalCode}</span>}
                    {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location}</span>}
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <div className="text-xs font-black">{new Date(event.startAt).toLocaleDateString('pt-BR')}</div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">{event.allDay ? 'Dia inteiro' : new Date(event.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {editorOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-2xl rounded-2xl border p-5 shadow-2xl" style={{ backgroundColor: theme.primary, borderColor: theme.border }}>
            <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: theme.border }}>
              <div>
                <h3 className="text-lg font-black">{isExisting ? 'Editar evento' : 'Novo evento'}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">O calendário alimenta automaticamente os alertas do sino de notificações.</p>
              </div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-lg p-1.5"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Título *</span>
                  <input required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} placeholder="Ex.: Manutenção preventiva - João Silva" />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Tipo</span>
                  <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as CalendarEventType })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    {EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Vincular proposta / cliente</span>
                <select value={editing.proposalCode || ''} onChange={(e) => applyProposal(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                  <option value="">Sem vínculo</option>
                  {proposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.code}>
                      {proposal.code} — {proposal.clientName}{proposal.maintenancePlan?.enabled ? ` — ${proposal.maintenancePlan.name}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {editing.maintenancePlanName && (
                <div className="rounded-xl border p-3 text-xs" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <div className="flex items-center gap-2 font-bold"><Wrench className="h-4 w-4" style={{ color: theme.secondary }} />{editing.maintenancePlanName}</div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">
                    Plano contratado • {selectedProposal?.maintenancePlan
                      ? formatMaintenanceFrequency(selectedProposal.maintenancePlan)
                      : editing.recurrenceInterval && editing.recurrenceUnit
                        ? formatMaintenanceFrequency({ interval: editing.recurrenceInterval, unit: editing.recurrenceUnit })
                        : `a cada ${editing.recurrenceMonths || 1} mês(es)`}.
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Data e hora</span>
                  <input type="datetime-local" required value={toLocalInputValue(editing.startAt)} onChange={(e) => setEditing({ ...editing, startAt: new Date(e.target.value).toISOString() })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Local</span>
                  <input value={editing.location || ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} placeholder="Endereço ou observação do local" />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Status</span>
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as CalendarEventStatus })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    {STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Prioridade</span>
                  <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as CalendarEventPriority })} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}>
                    {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                  </select>
                </label>
                <label className="flex items-end gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>
                  <input type="checkbox" checked={editing.allDay} onChange={(e) => setEditing({ ...editing, allDay: e.target.checked })} />
                  Dia inteiro
                </label>
              </div>

              {!isExisting && editing.type === 'Manutenção' && selectedProposal?.maintenancePlan?.enabled && (
                <label className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                  <input className="mt-0.5" type="checkbox" checked={repeatPlan} onChange={(e) => setRepeatPlan(e.target.checked)} />
                  <div>
                    <div className="text-xs font-bold">Gerar próximas manutenções automaticamente</div>
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      Cria até dois anos de visitas, {formatMaintenanceFrequency(selectedProposal.maintenancePlan)}, conforme o plano {selectedProposal.maintenancePlan.name}.
                    </div>
                  </div>
                </label>
              )}

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Observações</span>
                <textarea rows={3} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full resize-none rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }} />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: theme.border }}>
                <div>
                  {isExisting && (
                    <button type="button" onClick={handleDelete} className="btn-danger-outline inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditorOpen(false)} className="btn-cancel px-4 py-2 text-xs font-bold">Cancelar</button>
                  {isExisting && editing.status !== 'Concluído' && (
                    <button type="button" onClick={() => setEditing({ ...editing, status: 'Concluído' })} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold" style={{ borderColor: theme.border }}>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Concluir
                    </button>
                  )}
                  <button type="submit" className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold" style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}>
                    <Clock3 className="h-4 w-4" /> Salvar evento
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
