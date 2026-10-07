export interface ProposalNotificationItem {
  id: string;
  proposalCode: string;
  proposalId?: string;
  clientName: string;
  totalValue?: number;
  type: 'approved' | 'refused' | 'viewed';
  title: string;
  message: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  read: boolean;
}

const STORAGE_NOTIFS_KEY = 'solamigo_proposal_notifications_v1';
export const PROPOSAL_NOTIFICATIONS_EVENT = 'solamigo:proposal-notifications-updated';

type NotificationListener = (
  notifications: ProposalNotificationItem[],
  unreadCount: number
) => void;
const listeners = new Set<NotificationListener>();

export function getProposalNotifications(): ProposalNotificationItem[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('Erro ao carregar notificações de proposta:', err);
  }
  return [];
}

export function saveProposalNotifications(items: ProposalNotificationItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_NOTIFS_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent(PROPOSAL_NOTIFICATIONS_EVENT, { detail: items })
    );
  } catch (err) {
    console.warn('Erro ao salvar notificações de proposta:', err);
  }
}

function notifyAllListeners() {
  const items = getProposalNotifications();
  const unreadCount = items.filter((n) => !n.read).length;
  listeners.forEach((listener) => {
    try {
      listener(items, unreadCount);
    } catch {}
  });
}

export function addProposalNotification(
  item: Omit<ProposalNotificationItem, 'id' | 'createdAt' | 'read'>
): ProposalNotificationItem {
  const all = getProposalNotifications();
  
  // Evitar duplicações em menos de 10 segundos para a mesma ação
  const now = new Date();
  const recentDuplicate = all.find(
    (n) =>
      n.proposalCode === item.proposalCode &&
      n.type === item.type &&
      now.getTime() - new Date(n.createdAt).getTime() < 10000
  );
  if (recentDuplicate) {
    return recentDuplicate;
  }

  const newNotif: ProposalNotificationItem = {
    ...item,
    id: `prop-notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: now.toISOString(),
    read: false,
  };

  const updated = [newNotif, ...all.slice(0, 49)]; // Guarda até 50 notificações
  saveProposalNotifications(updated);
  notifyAllListeners();
  return newNotif;
}

export function markProposalNotificationAsRead(id: string): void {
  const all = getProposalNotifications();
  const updated = all.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveProposalNotifications(updated);
  notifyAllListeners();
}

export function markAllProposalNotificationsAsRead(): void {
  const all = getProposalNotifications();
  const updated = all.map((n) => ({ ...n, read: true }));
  saveProposalNotifications(updated);
  notifyAllListeners();
}

export function subscribeToProposalNotifications(
  listener: NotificationListener
): () => void {
  listeners.add(listener);

  // Envia estado inicial
  const items = getProposalNotifications();
  const unreadCount = items.filter((n) => !n.read).length;
  listener(items, unreadCount);

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<ProposalNotificationItem[]>;
    const list = customEvent.detail || getProposalNotifications();
    const count = list.filter((n) => !n.read).length;
    listener(list, count);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_NOTIFS_KEY) {
      const list = getProposalNotifications();
      const count = list.filter((n) => !n.read).length;
      listener(list, count);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(PROPOSAL_NOTIFICATIONS_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener(PROPOSAL_NOTIFICATIONS_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
}
