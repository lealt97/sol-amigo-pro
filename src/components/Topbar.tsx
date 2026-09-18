import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, HelpCircle, Menu } from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import { BrandLogo } from './BrandLogo';
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

  return (
    <header
      id="app-topbar"
      className="h-14 border-b border-[#30363D] flex items-center justify-between px-4 md:px-6 bg-[#161B22] text-[#C9D1D9] shrink-0 select-none z-30 sticky top-0"
    >
      <div className="flex items-center space-x-2.5 md:space-x-4 min-w-0">
        <div id="topbar-mobile-logo" className="md:hidden flex items-center shrink-0">
          <BrandLogo
            orientation="vertical"
            backgroundColor={theme?.primary || '#161B22'}
            className="w-7 h-7 object-contain"
          />
        </div>

        <button
          id="topbar-mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)] transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          id="topbar-sidebar-toggle-btn"
          onClick={handleSidebarToggle}
          className="hidden md:flex relative left-1 w-8 h-8 items-center justify-center rounded bg-[#21262D] border border-[#30363D] text-[#C9D1D9] hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-[var(--secondary-fg)] transition-colors"
          title="Abrir/fechar menu"
          aria-label="Abrir/fechar menu"
        >
          <Menu className="w-[18px] h-[18px]" />
        </button>

        <span className="text-white font-semibold text-xs md:text-sm truncate">
          {PAGE_TITLES[activePage] || 'Sol Amigo Pro'}
        </span>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        <div className="relative">
          <button
            ref={btnRef}
            id="topbar-notifications-btn"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative p-1.5 bg-[#21262D] border border-[#30363D] rounded-md text-[#C9D1D9] hover:text-white hover:bg-[#30363D] transition-colors"
            aria-label={unreadCount > 0 ? `${unreadCount} novas notificações` : 'Ver notificações'}
            title={unreadCount > 0 ? `${unreadCount} novo(s) lead(s)` : 'Notificações'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                id="topbar-notifications-badge"
                className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-[#161B22] animate-in zoom-in-75 duration-200"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              ref={popoverRef}
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-24px)] bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl z-50 text-[#C9D1D9] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#30363D] bg-[#21262D]/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Notificações</span>
                  {unreadCount > 0 && (
                    <span className="flex h-4 items-center justify-center rounded-full bg-red-500/20 text-red-400 px-1.5 text-[10px] font-bold border border-red-500/30">
                      {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-sol-amigo-text-hover
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-[var(--secondary)] hover:underline font-semibold transition-colors bg-transparent border-0"
                  >
                    Marcar como lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#30363D]/50">
                {notifications.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <Bell className="w-7 h-7 text-[#8B949E] opacity-40 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-white">Nenhuma notificação</p>
                    <p className="mt-1 text-[11px] text-[#8B949E]">
                      Quando novos leads forem captados, eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 text-xs hover:bg-[#21262D] cursor-pointer transition-colors flex items-start gap-2.5 ${
                        !notif.read ? 'bg-[#21262D]/40' : ''
                      }`}
                    >
                      <div
                        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                          !notif.read ? 'bg-red-500 shadow-sm' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-white truncate">Novo Lead Recebido</span>
                          <span className="text-[10px] text-[#8B949E] shrink-0">{notif.timeAgo}</span>
                        </div>
                        <p className="text-xs font-medium text-[var(--secondary)] truncate mt-0.5">
                          {notif.leadName}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#8B949E] truncate">
                          {notif.propertyType && <span>{notif.propertyType}</span>}
                          {(notif.city || notif.state) && (
                            <span>
                              {notif.propertyType ? '· ' : ''}
                              {[notif.city, notif.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {notif.phone && (
                            <span className="ml-auto text-[#6E7681] truncate">{notif.phone}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[#30363D] bg-[#161B22] flex items-center justify-between px-3">
                <button
                  type="button"
                  id="notifications-view-all-leads-btn"
                  data-sol-amigo-text-hover
                  onClick={() => {
                    setNotificationsOpen(false);
                    onNavigate?.('leads');
                  }}
                  className="text-xs text-white hover:text-[var(--secondary)] hover:underline font-semibold py-1 flex items-center gap-1 transition-colors bg-transparent border-0"
                >
                  <span>Ver todos os leads</span>
                  <span className="text-[10px]">&rarr;</span>
                </button>
                {unreadCount > 0 && (
                  <span className="text-[10px] text-[#8B949E]">
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
            className="p-1.5 bg-[#21262D] border border-[#30363D] rounded-md text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
            title="Ajuda & Documentação"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
