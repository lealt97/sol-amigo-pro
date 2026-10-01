import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  FileText,
  GripVertical,
  LayoutDashboard,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Target,
  UserCheck,
  Users,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react';
import { CalendarEvent, Client, Lead, PageKey, ThemeConfig } from '../types';
import {
  ClientProposal,
  fetchAllClientProposals,
  PROPOSALS_UPDATED_EVENT,
} from '../services/proposals';
import { fetchClients, CLIENTS_UPDATED_EVENT } from '../services/clients';
import { fetchLeads, LEADS_UPDATED_EVENT } from '../services/leads';
import { CALENDAR_EVENTS_UPDATED_EVENT, fetchCalendarEvents } from '../services/calendarEvents';
import {
  averageApprovedTicket,
  buildDashboardBuckets,
  countRowsInBucket,
  DashboardPeriod,
  filterByPeriod,
  getApprovedProposals,
  getDashboardDateRange,
  getDashboardPeriodLabel,
  normalizeProposalStatus,
  percentageChange,
  proposalConversionPercent,
  proposalStatusCounts,
  revenueInBucket,
  sumApprovedPower,
  sumApprovedRevenue,
} from '../utils/dashboardAnalytics';

interface DashboardViewProps {
  theme: ThemeConfig;
  onNavigate?: (page: PageKey, filter?: string) => void;
  onShowToast?: (message: string) => void;
}

type CardSize = 'compact' | 'small' | 'medium' | 'large';
type CardId =
  | 'revenue'
  | 'proposals'
  | 'conversion'
  | 'ticket'
  | 'power'
  | 'leads'
  | 'clients'
  | 'maintenance'
  | 'sales-chart'
  | 'status-donut'
  | 'activity-chart'
  | 'agenda'
  | 'recent-proposals';

interface CardLayoutItem {
  id: CardId;
  size: CardSize;
}

const LAYOUT_STORAGE_KEY = 'solamigo.dashboard.layout.v1';

const DEFAULT_LAYOUT: CardLayoutItem[] = [
  { id: 'revenue', size: 'compact' },
  { id: 'proposals', size: 'compact' },
  { id: 'conversion', size: 'compact' },
  { id: 'ticket', size: 'compact' },
  { id: 'power', size: 'compact' },
  { id: 'leads', size: 'compact' },
  { id: 'clients', size: 'compact' },
  { id: 'maintenance', size: 'compact' },
  { id: 'sales-chart', size: 'large' },
  { id: 'status-donut', size: 'medium' },
  { id: 'activity-chart', size: 'medium' },
  { id: 'agenda', size: 'medium' },
  { id: 'recent-proposals', size: 'medium' },
];

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: '30d', label: '30 dias' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Ano' },
  { value: 'all', label: 'Tudo' },
];

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const compactMoney = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 1,
});

const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const readLayout = (): CardLayoutItem[] => {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT;

    const knownIds = new Set(DEFAULT_LAYOUT.map((item) => item.id));
    const sanitized = parsed
      .filter((item) => knownIds.has(item?.id))
      .map((item) => ({
        id: item.id as CardId,
        size: (['compact', 'small', 'medium', 'large'].includes(item.size) ? item.size : 'medium') as CardSize,
      }));
    const missing = DEFAULT_LAYOUT.filter((item) => !sanitized.some((saved) => saved.id === item.id));
    return [...sanitized, ...missing];
  } catch {
    return DEFAULT_LAYOUT;
  }
};

const saveLayout = (layout: CardLayoutItem[]) => {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // layout persistence is optional
  }
};

const sizeClass: Record<CardSize, string> = {
  compact: 'col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2',
  small: 'col-span-12 sm:col-span-6 xl:col-span-3',
  medium: 'col-span-12 md:col-span-6',
  large: 'col-span-12',
};

const nextSize = (size: CardSize, direction: 1 | -1): CardSize => {
  const sizes: CardSize[] = ['compact', 'small', 'medium', 'large'];
  const index = sizes.indexOf(size);
  return sizes[Math.max(0, Math.min(sizes.length - 1, index + direction))];
};

const safeDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value: string, allDay = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  if (allDay) return date.toLocaleDateString('pt-BR');
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusLabel: Record<ReturnType<typeof normalizeProposalStatus>, string> = {
  approved: 'Aprovadas',
  negotiation: 'Em negociação',
  sent: 'Enviadas / visualizadas',
  refused: 'Recusadas',
  pending: 'Pendentes / rascunhos',
};

const statusColor: Record<ReturnType<typeof normalizeProposalStatus>, string> = {
  approved: '#10b981',
  negotiation: '#f59e0b',
  sent: '#3b82f6',
  refused: '#ef4444',
  pending: '#94a3b8',
};

const eventColor = (type: CalendarEvent['type']) => {
  if (type === 'Manutenção') return '#10b981';
  if (type === 'Instalação') return '#3b82f6';
  if (type === 'Vistoria') return '#8b5cf6';
  if (type === 'Visita Técnica') return '#f59e0b';
  if (type === 'Homologação') return '#06b6d4';
  if (type === 'Reunião Comercial') return '#ec4899';
  return '#94a3b8';
};

const DeltaBadge: React.FC<{ value: number | null; suffix?: string }> = ({ value, suffix = '%' }) => {
  if (value === null) {
    return <span className="max-w-full truncate text-[10px] font-semibold text-[var(--muted)]">sem base anterior</span>;
  }
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex max-w-full shrink-0 items-center gap-1 overflow-hidden whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-black ${
      positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
    }`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
};

interface CardShellProps {
  layout: CardLayoutItem;
  title: string;
  subtitle?: string;
  theme: ThemeConfig;
  draggedId: CardId | null;
  onDragStart: (id: CardId) => void;
  onDrop: (id: CardId) => void;
  onResize: (id: CardId, direction: 1 | -1) => void;
  children: React.ReactNode;
}

const CardShell: React.FC<CardShellProps> = ({
  layout,
  title,
  subtitle,
  theme,
  draggedId,
  onDragStart,
  onDrop,
  onResize,
  children,
}) => {
  const compact = layout.size === 'compact';

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(layout.id)}
      data-dashboard-card-size={layout.size}
      className={`${sizeClass[layout.size]} min-w-0 overflow-hidden rounded-2xl border shadow-xs transition-all duration-200 ${
        draggedId === layout.id ? 'opacity-50 scale-[0.99]' : ''
      }`}
      style={{ backgroundColor: theme.primary, borderColor: theme.border }}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b ${
          compact ? 'min-h-10 px-3 py-2' : 'min-h-12 px-4 py-2.5'
        }`}
        style={{ borderColor: theme.border }}
      >
        <div className="min-w-0">
          <h3 className={`truncate font-black text-[var(--text)] ${compact ? 'text-[11px]' : 'text-xs'}`} title={title}>
            {title}
          </h3>
          {!compact && subtitle && <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            data-no-override-hover
            onClick={() => onResize(layout.id, -1)}
            disabled={layout.size === 'compact'}
            className={`flex items-center justify-center rounded-lg border ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
            title="Diminuir card"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-no-override-hover
            onClick={() => onResize(layout.id, 1)}
            disabled={layout.size === 'large'}
            className={`flex items-center justify-center rounded-lg border ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
            title="Aumentar card"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            draggable
            data-no-override-hover
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              onDragStart(layout.id);
            }}
            className={`flex cursor-grab items-center justify-center rounded-lg border active:cursor-grabbing ${
              compact ? 'h-6 w-6' : 'h-7 w-7'
            }`}
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
            title="Clique e arraste para reorganizar"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className={`min-w-0 max-w-full overflow-hidden ${compact ? 'p-3' : 'p-4'}`}>{children}</div>
    </section>
  );
};

interface KpiProps {
  label: string;
  value: string;
  detail: string;
  Icon: React.ElementType;
  theme: ThemeConfig;
  delta?: number | null;
  accent?: string;
  compact?: boolean;
}

const KpiContent: React.FC<KpiProps> = ({ label, value, detail, Icon, theme, delta, accent, compact = false }) => (
  <div className={`flex min-w-0 max-w-full flex-col justify-between overflow-hidden ${compact ? 'min-h-[86px]' : 'min-h-[112px]'}`}>
    <div className={`flex min-w-0 items-start justify-between ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-bold uppercase tracking-[0.12em] text-[var(--muted)] ${compact ? 'text-[9px]' : 'text-[10px]'}`} title={label}>{label}</div>
        <div
          className={`max-w-full break-words font-black leading-tight tracking-tight text-[var(--text)] [overflow-wrap:anywhere] ${
            compact ? 'mt-1.5 text-[clamp(0.95rem,1.4vw,1.25rem)]' : 'mt-2 text-[clamp(1.2rem,1.8vw,1.5rem)]'
          }`}
          title={value}
        >
          {value}
        </div>
      </div>
      <div
        className={`flex shrink-0 items-center justify-center rounded-xl border ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}
        style={{
          borderColor: theme.border,
          backgroundColor: theme.background,
          color: accent || theme.secondary,
        }}
      >
        <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
      </div>
    </div>
    <div className={`${compact ? 'mt-2 flex min-w-0 flex-col items-start gap-1' : 'mt-3 flex min-w-0 items-center justify-between gap-2'}`}>
      <span className={`max-w-full truncate text-[var(--muted)] ${compact ? 'text-[9px]' : 'text-[10px]'}`} title={detail}>{detail}</span>
      {delta !== undefined && <DeltaBadge value={delta} />}
    </div>
  </div>
);

interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

const DonutChart: React.FC<{ data: DonutDatum[]; centerLabel: string; centerValue: string; size: CardSize }> = ({
  data,
  centerLabel,
  centerValue,
  size,
}) => {
  const compact = size === 'compact';
  const small = size === 'small';
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className={`flex min-w-0 max-w-full flex-col items-center overflow-hidden ${compact ? 'gap-3' : 'gap-5'} ${size === 'large' ? 'lg:flex-row lg:items-center' : ''}`}>
      <div className={`relative shrink-0 ${compact ? 'h-28 w-28' : small ? 'h-36 w-36' : 'h-44 w-44'}`}>
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="24" />
          {total > 0 && data.map((item) => {
            const fraction = item.value / total;
            const rawLength = circumference * fraction;
            const length = Math.max(0, rawLength - (item.value > 0 ? 2 : 0));
            const offset = -cumulative;
            cumulative += rawLength;
            return (
              <circle
                key={item.key}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="24"
                strokeLinecap="round"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className={`font-black text-[var(--text)] ${compact ? 'text-lg' : 'text-2xl'}`}>{centerValue}</div>
          <div className={`mt-0.5 font-bold uppercase tracking-wider text-[var(--muted)] ${compact ? 'text-[8px]' : 'text-[9px]'}`}>{centerLabel}</div>
        </div>
      </div>
      <div className={`min-w-0 w-full ${compact ? 'space-y-1.5' : 'space-y-2'}`}>
        {data.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.key} className={`flex min-w-0 items-center justify-between rounded-xl border ${compact ? 'gap-2 px-2 py-1.5' : 'gap-3 px-3 py-2'}`} style={{ borderColor: 'var(--border)' }}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={`truncate font-semibold text-[var(--text)] ${compact ? 'text-[9px]' : 'text-[11px]'}`} title={item.label}>{item.label}</span>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-black text-[var(--text)]">{item.value}</span>
                <span className="ml-1 text-[9px] text-[var(--muted)]">{percent.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface VerticalBarDatum {
  label: string;
  value: number;
  secondaryValue?: number;
}

const VerticalBarChart: React.FC<{
  data: VerticalBarDatum[];
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor: string;
  secondaryColor?: string;
  formatter?: (value: number) => string;
  size: CardSize;
}> = ({ data, primaryLabel, secondaryLabel, primaryColor, secondaryColor = '#94a3b8', formatter = number.format, size }) => {
  const compact = size === 'compact';
  const rawMax = Math.max(0, ...data.flatMap((item) => [item.value, item.secondaryValue || 0]));
  const max = Math.max(1, rawMax);

  if (rawMax === 0) {
    return (
      <div className={`flex flex-col items-center justify-center overflow-hidden text-center ${compact ? 'min-h-[170px]' : 'min-h-[260px]'}`}>
        <Activity className="h-9 w-9 text-[var(--muted)]" />
        <div className="mt-3 text-sm font-bold text-[var(--text)]">Sem dados para o período</div>
        <div className="mt-1 text-[10px] text-[var(--muted)]">Os gráficos serão preenchidos conforme o CRM receber movimentações.</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <div className={`flex min-w-0 flex-wrap items-center font-bold text-[var(--muted)] ${compact ? 'mb-2 gap-2 text-[8px]' : 'mb-4 gap-4 text-[10px]'}`}>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        {secondaryLabel && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
            {secondaryLabel}
          </span>
        )}
      </div>
      <div className={`relative overflow-hidden border-b border-l ${compact ? 'h-40 pl-1.5 pt-2' : 'h-56 pl-3 pt-3'}`} style={{ borderColor: 'var(--border)' }}>
        <div className="absolute inset-x-3 top-[25%] border-t border-dashed opacity-40" style={{ borderColor: 'var(--border)' }} />
        <div className="absolute inset-x-3 top-[50%] border-t border-dashed opacity-40" style={{ borderColor: 'var(--border)' }} />
        <div className="absolute inset-x-3 top-[75%] border-t border-dashed opacity-40" style={{ borderColor: 'var(--border)' }} />
        <div className={`relative z-10 flex h-full min-w-0 items-end overflow-hidden ${compact ? 'gap-0.5 pr-1' : 'gap-2 pr-2'}`}>
          {data.map((item) => {
            const primaryHeight = Math.max(item.value > 0 ? 3 : 0, (item.value / max) * 100);
            const secondaryHeight = Math.max((item.secondaryValue || 0) > 0 ? 3 : 0, ((item.secondaryValue || 0) / max) * 100);
            return (
              <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <div className={`flex items-end justify-center ${compact ? 'h-[calc(100%-18px)] gap-0.5' : 'h-[calc(100%-24px)] gap-1'}`}>
                  <div
                    className={`w-full rounded-t-md transition-all duration-300 ${compact ? 'max-w-3' : 'max-w-7'}`}
                    style={{ height: `${primaryHeight}%`, backgroundColor: primaryColor }}
                    title={`${primaryLabel}: ${formatter(item.value)}`}
                  />
                  {secondaryLabel && (
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${compact ? 'max-w-3' : 'max-w-7'}`}
                      style={{ height: `${secondaryHeight}%`, backgroundColor: secondaryColor }}
                      title={`${secondaryLabel}: ${formatter(item.secondaryValue || 0)}`}
                    />
                  )}
                </div>
                <div className={`truncate text-center font-semibold capitalize text-[var(--muted)] ${compact ? 'h-[18px] pt-0.5 text-[7px]' : 'h-6 pt-1 text-[9px]'}`}>
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`flex min-w-0 items-center justify-between text-[var(--muted)] ${compact ? 'mt-2 text-[8px]' : 'mt-3 text-[9px]'}`}>
        <span>0</span>
        <span>máx. {formatter(max)}</span>
      </div>
    </div>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  theme,
  onNavigate,
  onShowToast,
}) => {
  const [period, setPeriod] = useState<DashboardPeriod>('year');
  const [layout, setLayout] = useState<CardLayoutItem[]>(readLayout);
  const [draggedId, setDraggedId] = useState<CardId | null>(null);
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async (notify = false) => {
    setLoading(true);
    const [proposalRows, leadRows, clientRows, eventRows] = await Promise.all([
      fetchAllClientProposals().catch(() => []),
      fetchLeads().catch(() => []),
      fetchClients().catch(() => []),
      fetchCalendarEvents().catch(() => []),
    ]);
    setProposals(proposalRows);
    setLeads(leadRows);
    setClients(clientRows);
    setEvents(eventRows);
    setLoading(false);
    if (notify) onShowToast?.('Dashboard atualizado.');
  };

  useEffect(() => {
    void reload();

    const refresh = () => void reload();
    window.addEventListener(PROPOSALS_UPDATED_EVENT, refresh);
    window.addEventListener(LEADS_UPDATED_EVENT, refresh);
    window.addEventListener(CLIENTS_UPDATED_EVENT, refresh);
    window.addEventListener(CALENDAR_EVENTS_UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener(PROPOSALS_UPDATED_EVENT, refresh);
      window.removeEventListener(LEADS_UPDATED_EVENT, refresh);
      window.removeEventListener(CLIENTS_UPDATED_EVENT, refresh);
      window.removeEventListener(CALENDAR_EVENTS_UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const range = useMemo(() => getDashboardDateRange(period), [period]);

  const periodProposals = useMemo(
    () => filterByPeriod<ClientProposal>(proposals, (proposal) => proposal.createdAt, range),
    [proposals, range]
  );
  const periodLeads = useMemo(
    () => filterByPeriod<Lead>(leads, (lead) => lead.createdAt, range),
    [leads, range]
  );
  const periodClients = useMemo(
    () => filterByPeriod<Client>(clients, (client) => client.createdAt, range),
    [clients, range]
  );

  const previousRange = useMemo(() => ({
    start: range.previousStart,
    end: range.previousEnd || range.end,
    previousStart: null,
    previousEnd: null,
  }), [range]);

  const previousProposals = useMemo(
    () => range.previousStart && range.previousEnd
      ? filterByPeriod<ClientProposal>(proposals, (proposal) => proposal.createdAt, previousRange)
      : [],
    [proposals, previousRange, range.previousStart, range.previousEnd]
  );
  const previousLeads = useMemo(
    () => range.previousStart && range.previousEnd
      ? filterByPeriod<Lead>(leads, (lead) => lead.createdAt, previousRange)
      : [],
    [leads, previousRange, range.previousStart, range.previousEnd]
  );

  const currentRevenue = sumApprovedRevenue(periodProposals);
  const currentConversion = proposalConversionPercent(periodProposals);
  const currentTicket = averageApprovedTicket(periodProposals);
  const currentPower = sumApprovedPower(periodProposals);

  const previousRevenue = sumApprovedRevenue(previousProposals);
  const previousConversion = proposalConversionPercent(previousProposals);
  const previousTicket = averageApprovedTicket(previousProposals);
  const previousPower = sumApprovedPower(previousProposals);

  const activeClients = clients.filter((client) => client.status !== 'inativo' && client.activeStatus !== 'Inativo').length;

  const now = new Date();
  const next30Days = new Date(now);
  next30Days.setDate(next30Days.getDate() + 30);
  const upcomingMaintenances = events.filter((event) => {
    if (event.type !== 'Manutenção' || event.status === 'Concluído' || event.status === 'Cancelado') return false;
    const date = new Date(event.startAt);
    return date.getTime() >= now.getTime() && date.getTime() <= next30Days.getTime();
  });

  const upcomingEvents = useMemo(
    () => events
      .filter((event) => event.status !== 'Concluído' && event.status !== 'Cancelado')
      .filter((event) => new Date(event.startAt).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
      .slice(0, 6),
    [events]
  );

  const recentProposals = useMemo(
    () => [...periodProposals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6),
    [periodProposals]
  );

  const oldestDate = useMemo(() => {
    const dates = [
      ...proposals.map((proposal) => safeDate(proposal.createdAt)),
      ...leads.map((lead) => safeDate(lead.createdAt)),
    ].filter((date): date is Date => Boolean(date));
    if (!dates.length) return undefined;
    return new Date(Math.min(...dates.map((date) => date.getTime())));
  }, [proposals, leads]);

  const buckets = useMemo(
    () => buildDashboardBuckets(period, new Date(), oldestDate),
    [period, oldestDate]
  );

  const salesSeries = useMemo(
    () => buckets.map((bucket) => ({
      label: bucket.label,
      value: revenueInBucket(proposals, bucket),
    })),
    [buckets, proposals]
  );

  const activitySeries = useMemo(
    () => buckets.map((bucket) => ({
      label: bucket.label,
      value: countRowsInBucket<Lead>(leads, bucket, (lead) => lead.createdAt),
      secondaryValue: countRowsInBucket<ClientProposal>(proposals, bucket, (proposal) => proposal.createdAt),
    })),
    [buckets, leads, proposals]
  );

  const proposalStatuses = proposalStatusCounts(periodProposals);
  const donutData: DonutDatum[] = (Object.keys(proposalStatuses) as (keyof typeof proposalStatuses)[]).map((key) => ({
    key,
    label: statusLabel[key],
    value: proposalStatuses[key],
    color: statusColor[key],
  }));

  const approvedCount = getApprovedProposals(periodProposals).length;

  const resizeCard = (id: CardId, direction: 1 | -1) => {
    setLayout((current) => {
      const next = current.map((item) =>
        item.id === id ? { ...item, size: nextSize(item.size, direction) } : item
      );
      saveLayout(next);
      return next;
    });
  };

  const dropCard = (targetId: CardId) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    setLayout((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedId);
      const toIndex = current.findIndex((item) => item.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveLayout(next);
      return next;
    });
    setDraggedId(null);
  };

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    saveLayout(DEFAULT_LAYOUT);
    onShowToast?.('Layout do dashboard restaurado.');
  };

  const comparisonDetail = period === 'all'
    ? 'Todo o histórico disponível'
    : `Comparado ao ${getDashboardPeriodLabel(period).toLocaleLowerCase('pt-BR')} anterior`;

  const renderCardContent = (id: CardId, size: CardSize) => {
    const compact = size === 'compact';
    switch (id) {
      case 'revenue':
        return (
          <KpiContent
            label="Vendas aprovadas"
            value={money.format(currentRevenue)}
            detail={`${approvedCount} proposta(s) aprovada(s)`}
            Icon={CircleDollarSign}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : percentageChange(currentRevenue, previousRevenue)}
            accent="#10b981"
          />
        );
      case 'proposals':
        return (
          <KpiContent
            label="Propostas"
            value={number.format(periodProposals.length)}
            detail={`${approvedCount} aprovada(s) no período`}
            Icon={FileText}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : percentageChange(periodProposals.length, previousProposals.length)}
          />
        );
      case 'conversion':
        return (
          <KpiContent
            label="Conversão"
            value={`${currentConversion.toFixed(1)}%`}
            detail="Aprovadas ÷ propostas"
            Icon={Target}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : (previousProposals.length ? currentConversion - previousConversion : null)}
            accent="#8b5cf6"
          />
        );
      case 'ticket':
        return (
          <KpiContent
            label="Ticket médio"
            value={money.format(currentTicket)}
            detail="Média das propostas aprovadas"
            Icon={WalletCards}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : percentageChange(currentTicket, previousTicket)}
            accent="#f59e0b"
          />
        );
      case 'power':
        return (
          <KpiContent
            label="Potência vendida"
            value={`${number.format(currentPower)} kWp`}
            detail="Somente propostas aprovadas"
            Icon={Zap}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : percentageChange(currentPower, previousPower)}
            accent="#eab308"
          />
        );
      case 'leads':
        return (
          <KpiContent
            label="Leads captados"
            value={number.format(periodLeads.length)}
            detail={comparisonDetail}
            Icon={Users}
            theme={theme}
            compact={compact}
            delta={period === 'all' ? undefined : percentageChange(periodLeads.length, previousLeads.length)}
            accent="#3b82f6"
          />
        );
      case 'clients':
        return (
          <KpiContent
            label="Clientes ativos"
            value={number.format(activeClients)}
            detail={`+${periodClients.length} cadastro(s) no período`}
            Icon={UserCheck}
            theme={theme}
            compact={compact}
            accent="#06b6d4"
          />
        );
      case 'maintenance':
        return (
          <KpiContent
            label="Manutenções próximas"
            value={number.format(upcomingMaintenances.length)}
            detail="Próximos 30 dias"
            Icon={Wrench}
            theme={theme}
            compact={compact}
            accent="#10b981"
          />
        );
      case 'sales-chart':
        return (
          <VerticalBarChart
            data={salesSeries}
            primaryLabel="Vendas aprovadas"
            primaryColor={theme.secondary}
            formatter={(value) => compactMoney.format(value)}
            size={size}
          />
        );
      case 'status-donut':
        return (
          <DonutChart
            data={donutData}
            centerLabel="propostas"
            centerValue={number.format(periodProposals.length)}
            size={size}
          />
        );
      case 'activity-chart':
        return (
          <VerticalBarChart
            data={activitySeries}
            primaryLabel="Leads"
            secondaryLabel="Propostas"
            primaryColor={theme.secondary}
            secondaryColor="#94a3b8"
            formatter={(value) => number.format(value)}
            size={size}
          />
        );
      case 'agenda':
        return upcomingEvents.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
            <CalendarDays className="h-9 w-9 text-[var(--muted)]" />
            <div className="mt-3 text-sm font-bold">Nenhum compromisso futuro</div>
            <button
              type="button"
              data-sol-amigo-text-hover
              onClick={() => onNavigate?.('calendario')}
              className="mt-2 text-xs font-bold"
              style={{ color: theme.secondary }}
            >
              Abrir calendário
            </button>
          </div>
        ) : (
          <div className="min-w-0 max-w-full space-y-2 overflow-hidden">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                data-no-override-hover
                onClick={() => onNavigate?.('calendario')}
                className={`flex min-w-0 w-full rounded-xl border text-left transition-opacity hover:opacity-80 ${
                  compact ? 'flex-col items-stretch gap-1.5 p-2' : 'items-center gap-3 p-3'
                }`}
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                <span className={`shrink-0 rounded-full ${compact ? 'h-1 w-full' : 'h-9 w-1'}`} style={{ backgroundColor: eventColor(event.type) }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-black text-[var(--text)]">{event.title}</div>
                  <div className="mt-0.5 truncate text-[10px] text-[var(--muted)]">
                    {event.clientName || event.type}
                  </div>
                </div>
                <div className={`max-w-full shrink-0 truncate font-bold text-[var(--muted)] ${compact ? 'text-left text-[9px]' : 'text-right text-[10px]'}`} title={formatDateTime(event.startAt, event.allDay)}>
                  {formatDateTime(event.startAt, event.allDay)}
                </div>
              </button>
            ))}
            <button
              type="button"
              data-sol-amigo-text-hover
              onClick={() => onNavigate?.('calendario')}
              className="pt-1 text-xs font-bold"
              style={{ color: theme.secondary }}
            >
              Ver calendário completo →
            </button>
          </div>
        );
      case 'recent-proposals':
        return recentProposals.length === 0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
            <FileText className="h-9 w-9 text-[var(--muted)]" />
            <div className="mt-3 text-sm font-bold">Nenhuma proposta no período</div>
          </div>
        ) : (
          <div className="min-w-0 max-w-full space-y-2 overflow-hidden">
            {recentProposals.map((proposal) => {
              const normalized = normalizeProposalStatus(proposal.status);
              return (
                <button
                  key={proposal.id}
                  type="button"
                  data-no-override-hover
                  onClick={() => onNavigate?.('propostas', proposal.code)}
                  className={`flex min-w-0 w-full rounded-xl border text-left transition-opacity hover:opacity-80 ${
                    compact ? 'flex-col items-stretch gap-1.5 p-2' : 'items-center justify-between gap-3 p-3'
                  }`}
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-[var(--text)]">{proposal.clientName}</div>
                    <div className="mt-0.5 text-[10px] text-[var(--muted)]">{proposal.code} · {number.format(proposal.systemPowerKWp)} kWp</div>
                  </div>
                  <div className={`min-w-0 shrink-0 ${compact ? 'text-left' : 'text-right'}`}>
                    <div className={`max-w-full truncate font-black text-[var(--text)] ${compact ? 'text-[11px]' : 'text-xs'}`} title={money.format(proposal.totalValue)}>{money.format(proposal.totalValue)}</div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold" style={{ color: statusColor[normalized] }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor[normalized] }} />
                      {statusLabel[normalized]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  const cardMeta: Record<CardId, { title: string; subtitle?: string }> = {
    revenue: { title: 'Receita aprovada', subtitle: getDashboardPeriodLabel(period) },
    proposals: { title: 'Volume de propostas', subtitle: getDashboardPeriodLabel(period) },
    conversion: { title: 'Taxa de conversão', subtitle: getDashboardPeriodLabel(period) },
    ticket: { title: 'Ticket médio aprovado', subtitle: getDashboardPeriodLabel(period) },
    power: { title: 'Potência comercializada', subtitle: getDashboardPeriodLabel(period) },
    leads: { title: 'Aquisição de leads', subtitle: getDashboardPeriodLabel(period) },
    clients: { title: 'Base de clientes', subtitle: 'Clientes ativos' },
    maintenance: { title: 'Pós-venda', subtitle: 'Manutenções nos próximos 30 dias' },
    'sales-chart': { title: 'Evolução das vendas', subtitle: `Barras verticais · ${getDashboardPeriodLabel(period)}` },
    'status-donut': { title: 'Distribuição das propostas', subtitle: 'Gráfico circular por status' },
    'activity-chart': { title: 'Leads x propostas', subtitle: 'Comparativo de atividade comercial' },
    agenda: { title: 'Próximos eventos', subtitle: 'Agenda operacional' },
    'recent-proposals': { title: 'Propostas recentes', subtitle: getDashboardPeriodLabel(period) },
  };

  return (
    <div id="dashboard-view" className="mx-auto max-w-[1600px] space-y-5">
      <section className="flex flex-col gap-4 border-b pb-5 xl:flex-row xl:items-end xl:justify-between" style={{ borderColor: theme.border }}>
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--dim)]">
            <LayoutDashboard className="h-4 w-4" />
            Central de gestão
          </div>
          <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Dashboard Sol Amigo Pro</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            Indicadores comerciais, pipeline, clientes e pós-venda em um painel personalizável. Arraste os cards pelo ícone e use − / + para alternar entre compacto, pequeno, médio e grande.
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex flex-wrap rounded-xl border p-1" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
            {PERIODS.map((item) => (
              <button
                key={item.value}
                type="button"
                data-no-override-hover
                onClick={() => setPeriod(item.value)}
                className="rounded-lg px-3 py-2 text-[11px] font-bold transition-all"
                style={period === item.value
                  ? { backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }
                  : { color: theme.text }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-no-override-hover
              onClick={resetLayout}
              className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold"
              style={{ borderColor: theme.border, backgroundColor: theme.primary }}
              title="Restaurar ordem e tamanho dos cards"
            >
              <RotateCcw className="h-4 w-4" />
              Layout
            </button>
            <button
              type="button"
              data-no-override-hover
              onClick={() => void reload(true)}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold"
              style={{ backgroundColor: theme.secondary, color: 'var(--secondary-fg)' }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ borderColor: theme.border, backgroundColor: theme.primary }}>
        <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
          <Activity className="h-4 w-4" style={{ color: theme.secondary }} />
          <span>
            Período ativo: <strong className="text-[var(--text)]">{getDashboardPeriodLabel(period)}</strong>
          </span>
        </div>
        <div className="text-[10px] text-[var(--muted)]">
          Os números são calculados a partir dos dados reais cadastrados no CRM.
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-12 gap-4">
        {layout.map((item) => {
          const meta = cardMeta[item.id];
          return (
            <CardShell
              key={item.id}
              layout={item}
              title={meta.title}
              subtitle={meta.subtitle}
              theme={theme}
              draggedId={draggedId}
              onDragStart={setDraggedId}
              onDrop={dropCard}
              onResize={resizeCard}
            >
              {loading ? (
                <div className={`flex items-center justify-center ${item.size === 'compact' ? 'min-h-[86px]' : 'min-h-[112px]'}`}>
                  <RefreshCw className="h-5 w-5 animate-spin text-[var(--muted)]" />
                </div>
              ) : renderCardContent(item.id, item.size)}
            </CardShell>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border px-4 py-3 text-[10px] text-[var(--muted)]" style={{ borderColor: theme.border }}>
        <span>Dashboard personalizável · ordem e tamanho dos cards ficam salvos neste navegador.</span>
        <span className="hidden sm:inline">Sol Amigo Pro</span>
      </div>
    </div>
  );
};
