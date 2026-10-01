import { ClientProposal } from '../services/proposals';
import { Lead } from '../types';

export type DashboardPeriod = '30d' | 'quarter' | 'semester' | 'year' | 'all';

export interface DateRange {
  start: Date | null;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
}

export interface DashboardBucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

const startOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export function getDashboardPeriodLabel(period: DashboardPeriod): string {
  const labels: Record<DashboardPeriod, string> = {
    '30d': '30 dias',
    quarter: 'Trimestre',
    semester: 'Semestre',
    year: 'Ano',
    all: 'Todo o período',
  };
  return labels[period];
}

export function getDashboardDateRange(period: DashboardPeriod, now = new Date()): DateRange {
  const end = endOfDay(now);

  if (period === 'all') {
    return { start: null, end, previousStart: null, previousEnd: null };
  }

  const durations: Record<Exclude<DashboardPeriod, 'all'>, number> = {
    '30d': 30,
    quarter: 90,
    semester: 183,
    year: 365,
  };
  const days = durations[period];
  const start = startOfDay(addDays(now, -(days - 1)));
  const previousEnd = endOfDay(addDays(start, -1));
  const previousStart = startOfDay(addDays(previousEnd, -(days - 1)));
  return { start, end, previousStart, previousEnd };
}

export function dateInRange(dateInput: string | undefined, start: Date | null, end: Date): boolean {
  if (!dateInput) return false;
  const time = new Date(dateInput).getTime();
  if (Number.isNaN(time)) return false;
  return (start ? time >= start.getTime() : true) && time <= end.getTime();
}

export function filterByPeriod<T>(
  rows: T[],
  getDate: (row: T) => string | undefined,
  range: DateRange
): T[] {
  return rows.filter((row) => dateInRange(getDate(row), range.start, range.end));
}

export function normalizeProposalStatus(status: string): 'approved' | 'negotiation' | 'sent' | 'refused' | 'pending' {
  const value = String(status || '').trim().toLocaleLowerCase('pt-BR');
  if (value.includes('aprov')) return 'approved';
  if (value.includes('negocia')) return 'negotiation';
  if (value.includes('recus') || value.includes('cancel')) return 'refused';
  if (value.includes('enviad') || value.includes('visualiz')) return 'sent';
  return 'pending';
}

export function getApprovedProposals(proposals: ClientProposal[]): ClientProposal[] {
  return proposals.filter((proposal) => normalizeProposalStatus(proposal.status) === 'approved');
}

export function sumApprovedRevenue(proposals: ClientProposal[]): number {
  return getApprovedProposals(proposals).reduce(
    (sum, proposal) => sum + Math.max(0, Number(proposal.totalValue) || 0),
    0
  );
}

export function sumApprovedPower(proposals: ClientProposal[]): number {
  return getApprovedProposals(proposals).reduce(
    (sum, proposal) => sum + Math.max(0, Number(proposal.systemPowerKWp) || 0),
    0
  );
}

export function proposalConversionPercent(proposals: ClientProposal[]): number {
  if (!proposals.length) return 0;
  return (getApprovedProposals(proposals).length / proposals.length) * 100;
}

export function averageApprovedTicket(proposals: ClientProposal[]): number {
  const approved = getApprovedProposals(proposals);
  if (!approved.length) return 0;
  return sumApprovedRevenue(approved) / approved.length;
}

export function percentageChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function buildDashboardBuckets(period: DashboardPeriod, now = new Date(), oldestDate?: Date): DashboardBucket[] {
  if (period === '30d') {
    const end = endOfDay(now);
    const firstStart = startOfDay(addDays(now, -27));
    return Array.from({ length: 4 }, (_, index) => {
      const start = startOfDay(addDays(firstStart, index * 7));
      const bucketEnd = index === 3 ? end : endOfDay(addDays(start, 6));
      return {
        key: `week-${index}`,
        label: `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
        start,
        end: bucketEnd,
      };
    });
  }

  if (period === 'all' && oldestDate) {
    const firstYear = oldestDate.getFullYear();
    const lastYear = now.getFullYear();
    const startYear = Math.max(firstYear, lastYear - 5);
    return Array.from({ length: lastYear - startYear + 1 }, (_, index) => {
      const year = startYear + index;
      return {
        key: String(year),
        label: String(year),
        start: new Date(year, 0, 1, 0, 0, 0, 0),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    });
  }

  const monthCount: Record<Exclude<DashboardPeriod, '30d' | 'all'>, number> = {
    quarter: 3,
    semester: 6,
    year: 12,
  };
  const count = period === 'all' ? 12 : monthCount[period];
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstMonth = addMonths(currentMonthStart, -(count - 1));

  return Array.from({ length: count }, (_, index) => {
    const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1, 0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      start,
      end,
    };
  });
}

export function countRowsInBucket<T>(
  rows: T[],
  bucket: DashboardBucket,
  getDate: (row: T) => string | undefined
): number {
  return rows.filter((row) => dateInRange(getDate(row), bucket.start, bucket.end)).length;
}

export function revenueInBucket(proposals: ClientProposal[], bucket: DashboardBucket): number {
  return proposals
    .filter((proposal) => dateInRange(proposal.createdAt, bucket.start, bucket.end))
    .filter((proposal) => normalizeProposalStatus(proposal.status) === 'approved')
    .reduce((sum, proposal) => sum + Math.max(0, Number(proposal.totalValue) || 0), 0);
}

export function proposalStatusCounts(proposals: ClientProposal[]) {
  const counts = { approved: 0, negotiation: 0, sent: 0, refused: 0, pending: 0 };
  proposals.forEach((proposal) => {
    counts[normalizeProposalStatus(proposal.status)] += 1;
  });
  return counts;
}

export function uniqueLeadCount(leads: Lead[]): number {
  return new Set(leads.map((lead) => lead.id)).size;
}
