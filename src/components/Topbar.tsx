import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, HelpCircle, Menu } from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import { BrandLogo } from './BrandLogo';
import { getContrastFg } from '../utils/themeEngine';
import {
  LeadNotificationItem,
  markAllLeadsAsRead,
  markLeadAsRead,
  subscribeToLeadNotifications,
} from '../services/leadNotifications';

interface TopbarProps {
  activePage: PageKey;
  theme: ThemeConfig;
  onOpenMobileMenu: () => void;
  onOpenHelp?: () => void;
  onNavigate?: (page: PageKey) => void;
}

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  clientes: 'Clientes',
  dimensionamento: 'Dimensionamentos',
  propostas: 'Propostas',
  kits: 'Kits',
  'pos-venda': 'Pós-venda',
  anotacoes: 'Anotações',
  levantamento: 'Levantamento',
  empresas: 'Empresas',
  contratos: 'Contratos',
  produtos: 'Produtos e kits',
  tarefas: 'Tarefas',
  relatorios: 'Relatórios',
  financeiro: 'Financeiro',
  perfil: 'Perfil',
  personalizacao: 'Personalização da Conta',
  'pdf-customizacoes': 'Customizações do PDF',
  integracoes: 'Formulário no site',
  seguranca: 'Segurança',
  'area-risco': 'Área de risco',
};

export const Topbar: React.FC<TopbarProps> = ({
  activePage,
  theme,
  onOpenMobileMenu,
  onOpenHelp,
  onNavigate,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<LeadNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLeadNotifications((items, count) => {
      setNotifications(items);
      setUnreadCount(count);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen]);

  const handleSidebarToggle = () => {
    document.getElementById('sidebar-toggle-btn')?.click();
  };

  const handleNotificationClick = (item: LeadNotificationItem) => {
    markLeadAsRead(item.id);
    setNotificationsOpen(false);
    onNavigate?.('leads');
  };

  const handleMarkAllRead = () => {
    markAllLeadsAsRead();
  };

  const topbarBg = theme?.primary || '#161B22';
  const topbarFg = getContrastFg(topbarBg) === '#FFFFFF' ? '#FFFFFF' : (theme?.text || '#0F172A');
  const isDark = getContrastFg(topbarBg) === '#FFFFFF';
  const borderColor = theme?.border || '#30363D';
  const controlBg = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const controlBorder = borderColor;
  const controlFg = topbarFg;

  return (
    <header
      id="app-topbar"
      className="h-14 border-b flex items-center justify-between px-4 md:px-6 shrink-0 select-none z-30 sticky top-0 transition-colors"
      style={{
        backgroundColor: topbarBg,
        borderColor,
        color: topbarFg,
      }}
    >
      <div className="flex items-center space-x-2.5 md:space-x-4 min-w-0">
        <div id="topbar-mobile-logo" className="md:hidden flex items-center shrink-0">
          <BrandLogo
            orientation="vertical"
            backgroundColor={topbarBg}
            className="w-7 h-7 object-contain"
          />
        </div>

        <button
          id="topbar-mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded border transition-colors hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)]"
          style={{ backgroundColor: controlBg, borderColor: controlBorder, color: controlFg }}
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          id="topbar-sidebar-toggle-btn"
          onClick={handleSidebarToggle}
          className="hidden md:flex relative left-1 w-8 h-8 items-center justify-center rounded border transition-colors hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)]"
          style={{ backgroundColor: controlBg, borderColor: controlBorder, color: controlFg }}
          title="Abrir/fechar menu"
          aria-label="Abrir/fechar menu"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <span className="font-semibold text-xs md:text-sm truncate" style={{ color: topbarFg }}>
          {PAGE_TITLES[activePage] || 'Sol Amigo Pro'}
        </span>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        <div className="relative">
          <button
            ref={btnRef}
            id="topbar-notifications-btn"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative p-1.5 rounded-md border transition-opacity hover:opacity-85"
            style={{ backgroundColor: controlBg, borderColor: controlBorder, color: controlFg }}
            aria-label={unreadCount > 0 ? `${unreadCount} novas notificações` : 'Ver notificações'}
            title={unreadCount > 0 ? `${unreadCount} novo(s) lead(s)` : 'Notificações'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                id="topbar-notifications-badge"
                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-[var(--primary)] animate-in zoom-in-75 duration-200"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              ref={popoverRef}
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] rounded-xl shadow-2xl z-50 border overflow-hidden animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: topbarBg,
                borderColor,
                color: topbarFg,
              }}
            >
              <div
                className="flex items-center justify-between px-3.5 py-2.5 border-b"
                style={{
                  borderColor,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: topbarFg }}>
                    Notificações
                  </span>
                  {unreadCount > 0 && (
                    <span className="flex h-4 items-center justify-center rounded-full bg-red-500/20 text-red-500 px-1.5 text-[10px] font-bold border border-red-500/30">
                      {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-sol-amigo-text-hover
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--secondary)] hover:underline font-semibold transition-colors bg-transparent border-0 cursor-pointer"
                  >
                    Marcar como lidas
                  </button>
                )}
              </div>

              <div
                className="max-h-80 overflow-y-auto divide-y"
                style={{ borderColor }}
              >
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <Bell className="w-7 h-7 opacity-40 mx-auto mb-2" style={{ color: topbarFg }} />
                    <p className="text-xs font-semibold" style={{ color: topbarFg }}>
                      Nenhuma notificação
                    </p>
                    <p className="mt-1 text-[11px] opacity-70" style={{ color: topbarFg }}>
                      Quando novos leads forem captados, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className="p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 hover:opacity-90"
                      style={{
                        backgroundColor: !notif.read
                          ? isDark
                            ? 'rgba(255, 255, 255, 0.06)'
                            : 'rgba(0, 0, 0, 0.04)'
                          : 'transparent',
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                    >
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          !notif.read ? 'bg-red-500 shadow-sm' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate" style={{ color: topbarFg }}>
                            Novo Lead Recebido
                          </span>
                          <span className="text-[10px] opacity-70 shrink-0" style={{ color: topbarFg }}>
                            {notif.timeAgo}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[var(--secondary)] truncate mt-0.5">
                          {notif.leadName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] opacity-75 truncate" style={{ color: topbarFg }}>
                          {notif.propertyType && <span>{notif.propertyType}</span>}
                          {(notif.city || notif.state) && (
                            <span>
                              {notif.propertyType ? '· ' : ''}
                              {[notif.city, notif.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {notif.phone && (
                            <span className="ml-auto opacity-70 truncate">{notif.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                className="p-2 border-t flex items-center justify-between px-3"
                style={{
                  borderColor,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                }}
              >
                <button
                  type="button"
                  id="notifications-view-all-leads-btn"
                  data-sol-amigo-text-hover
                  onClick={() => {
                    setNotificationsOpen(false);
                    onNavigate?.('leads');
                  }}
                  className="text-xs hover:text-[var(--secondary)] hover:underline font-semibold py-1 flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer"
                  style={{ color: topbarFg }}
                >
                  <span>Ver todos os leads</span>
                  <span className="text-[10px]">&rarr;</span>
                </button>
                {unreadCount > 0 && (
                  <span className="text-[10px] opacity-70" style={{ color: topbarFg }}>
                    {unreadCount} não {unreadCount > 1 ? 'lidos' : 'lido'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="p-1.5 rounded-md border transition-opacity hover:opacity-85"
            style={{ backgroundColor: controlBg, borderColor: controlBorder, color: controlFg }}
            title="Ajuda & Documentação"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
