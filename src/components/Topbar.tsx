import React, { useState } from 'react';
import { Bell, HelpCircle, Menu } from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import { BrandLogo } from './BrandLogo';

interface TopbarProps {
  activePage: PageKey;
  theme: ThemeConfig;
  onOpenMobileMenu: () => void;
  onOpenHelp?: () => void;
}

const PAGE_TITLES: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  oportunidades: 'Oportunidades',
  clientes: 'Clientes',
  levantamento: 'Levantamento',
  empresas: 'Empresas',
  propostas: 'Propostas',
  contratos: 'Contratos',
  produtos: 'Produtos',
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
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSidebarToggle = () => {
    document.getElementById('sidebar-toggle-btn')?.click();
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
          className="md:hidden p-1.5 rounded bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <button
          id="topbar-sidebar-toggle-btn"
          onClick={handleSidebarToggle}
          className="hidden md:flex relative left-1 w-8 h-8 items-center justify-center rounded bg-[#21262D] border border-[#30363D] text-[#C9D1D9] hover:text-white hover:bg-[#30363D] transition-colors"
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
            id="topbar-notifications-btn"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative p-1.5 bg-[#21262D] border border-[#30363D] rounded-md text-[#C9D1D9] hover:text-white hover:bg-[#30363D] transition-colors"
            aria-label="Ver notificações"
          >
            <Bell className="w-4 h-4" />
          </button>

          {notificationsOpen && (
            <div
              id="notifications-popover"
              className="absolute right-0 mt-2 w-64 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl p-4 z-50 text-[#C9D1D9]"
            >
              <p className="text-xs font-semibold text-white">Notificações</p>
              <p className="mt-2 text-[11px] text-[#8B949E]">Nenhuma notificação.</p>
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
