import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export interface LeadNotificationItem {
  id: string; // lead id
  leadName: string;
  phone?: string;
  city?: string;
  state?: string;
  propertyType?: string;
  source?: string;
  status: string;
  createdAt: string;
  read: boolean;
  timeAgo: string;
}

const STORAGE_READ_KEY = 'sol_amigo_read_lead_ids';
const STORAGE_INIT_KEY = 'sol_amigo_notif_initialized';

function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveStoredReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_READ_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function formatTimeAgo(dateInput: string | Date): string {
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return 'Recentemente';

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Agora';
    if (diffSec < 3600) {
      const min = Math.max(1, Math.floor(diffSec / 60));
      return `há ${min} min`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `há ${hours}h`;
    }
    if (diffSec < 172800) {
      return 'Ontem';
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return 'Recentemente';
  }
}

type NotificationListener = (notifications: LeadNotificationItem[], unreadCount: number) => void;
const listeners = new Set<NotificationListener>();

let currentNotifications: LeadNotificationItem[] = [];
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let pollTimer: any = null;

function notifyListeners() {
  const unreadCount = currentNotifications.filter((n) => !n.read).length;
  listeners.forEach((listener) => {
    try {
      listener([...currentNotifications], unreadCount);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribeToLeadNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);
  const unreadCount = currentNotifications.filter((n) => !n.read).length;
  listener([...currentNotifications], unreadCount);

  // Initialize service if not already started
  startLeadNotificationService();

  return () => {
    listeners.delete(listener);
  };
}

export function markLeadAsRead(leadId: string) {
  const readIds = getStoredReadIds();
  readIds.add(leadId);
  saveStoredReadIds(readIds);

  currentNotifications = currentNotifications.map((item) =>
    item.id === leadId ? { ...item, read: true } : item
  );
  notifyListeners();
}

export function markAllLeadsAsRead() {
  const readIds = getStoredReadIds();
  currentNotifications.forEach((item) => {
    readIds.add(item.id);
  });
  saveStoredReadIds(readIds);

  currentNotifications = currentNotifications.map((item) => ({
    ...item,
    read: true,
  }));
  notifyListeners();
}

export async function fetchAndSyncLeadNotifications(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('id, name, phone, city, state, property_type, source, status, created_at')
      .is('archived_at', null)
      .is('trashed_at', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return;

    const readIds = getStoredReadIds();
    const isFirstRun = !localStorage.getItem(STORAGE_INIT_KEY);

    if (isFirstRun) {
      // No primeiro acesso: leads em status 'novo' iniciam como não lidos (notificações ativas).
      // Os leads já avançados (em contato, qualificado, proposta, ganho, etc) são considerados já lidos.
      data.forEach((row: any) => {
        if (row.status !== 'novo') {
          readIds.add(row.id);
        }
      });
      localStorage.setItem(STORAGE_INIT_KEY, 'true');
      saveStoredReadIds(readIds);
    }

    currentNotifications = data.map((row: any) => {
      const isRead = readIds.has(row.id);
      return {
        id: row.id,
        leadName: row.name || 'Lead sem nome',
        phone: row.phone,
        city: row.city,
        state: row.state,
        propertyType: row.property_type,
        source: row.source,
        status: row.status,
        createdAt: row.created_at,
        read: isRead,
        timeAgo: formatTimeAgo(row.created_at),
      };
    });

    notifyListeners();
  } catch {
    // Non-blocking
  }
}

export function registerNewIncomingLead(lead: Partial<Lead> & { id: string; name: string; created_at?: string }) {
  const readIds = getStoredReadIds();
  const leadId = lead.id;
  const isRead = readIds.has(leadId);
  const createdAt = lead.createdAt || (lead as any).created_at || new Date().toISOString();

  // Se já existe na lista, atualiza
  const existingIdx = currentNotifications.findIndex((n) => n.id === leadId);
  const item: LeadNotificationItem = {
    id: leadId,
    leadName: lead.name || 'Novo interessado',
    phone: lead.phone,
    city: lead.city,
    state: lead.state,
    propertyType: lead.propertyType,
    source: lead.source,
    status: lead.status || 'novo',
    createdAt,
    read: isRead,
    timeAgo: formatTimeAgo(createdAt),
  };

  if (existingIdx >= 0) {
    currentNotifications[existingIdx] = { ...currentNotifications[existingIdx], ...item };
  } else {
    currentNotifications = [item, ...currentNotifications];
  }

  notifyListeners();
}

let isServiceStarted = false;

export function startLeadNotificationService() {
  if (isServiceStarted) return;
  isServiceStarted = true;

  // Carregamento inicial
  void fetchAndSyncLeadNotifications();

  // Escuta alterações via Realtime do Supabase
  try {
    realtimeChannel = supabase
      .channel('realtime:lead-notifications-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
        },
        (payload) => {
          if (payload?.new?.id) {
            registerNewIncomingLead({
              id: payload.new.id,
              name: payload.new.name,
              phone: payload.new.phone,
              city: payload.new.city,
              state: payload.new.state,
              propertyType: payload.new.property_type,
              source: payload.new.source,
              status: payload.new.status,
              created_at: payload.new.created_at,
            });
          }
        }
      )
      .subscribe();
  } catch {
    // Fallback para polling
  }

  // Polling regular a cada 20 segundos
  pollTimer = setInterval(() => {
    void fetchAndSyncLeadNotifications();
  }, 20000);

  // Sincroniza quando a sessão de autenticação é carregada ou alterada
  try {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        void fetchAndSyncLeadNotifications();
      }
    });
  } catch {
    // Non-blocking
  }

  // Sincroniza ao retornar o foco à aba
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      void fetchAndSyncLeadNotifications();
    });

    // Custom event para disparo imediato interno
    window.addEventListener('sol-amigo:lead-created', (e: any) => {
      if (e?.detail?.id) {
        registerNewIncomingLead(e.detail);
      } else {
        void fetchAndSyncLeadNotifications();
      }
    });
  }
}
