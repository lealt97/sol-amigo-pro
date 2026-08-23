import React, { useState } from 'react';
import {
  Search,
  Plus,
  Bell,
  Menu,
  Sun,
  Github,
  CheckCircle2,
  Sparkles,
  GitBranch,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';

interface TopbarProps {
  activePage: PageKey;
  theme: ThemeConfig;
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
  onOpenGitHub?: () => void;
  onOpenGitHubModal?: () => void;
  onOpenHelp?: () => void;
  onOpenNewProposal?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

const PAGE_TITLES: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Geral',
    subtitle: 'Visão executiva das propostas comerciais e energia solar',
  },
  oportunidades: {
    title: 'Funil de Oportunidades',
    subtitle: 'Pipeline de vendas, visitas técnicas e negociações ativas',
  },
  clientes: {
    title: 'Gestão de Clientes',
    subtitle: 'Base de contatos, histórico de consumo e unidades consumidoras',
  },
  empresas: {
    title: 'Empresas & Parceiros',
    subtitle: 'Integradores, instaladores credenciados e fornecedores',
  },
  propostas: {
    title: 'Gerador de Propostas FV',
    subtitle: 'Dimensionamento solar, análise financeira, payback e propostas',
  },
  contratos: {
    title: 'Contratos & Assinaturas',
    subtitle: 'Contratos de prestação de serviço, garantias e homologação',
  },
  produtos: {
    title: 'Catálogo de Equipamentos',
    subtitle: 'Módulos Tier-1, inversores string, microinversores e estruturas',
  },
  tarefas: {
    title: 'Tarefas & Homologação',
    subtitle: 'Fluxo com concessionárias de energia e cronograma de obras',
  },
  relatorios: {
    title: 'Relatórios & Inteligência',
    subtitle: 'Métricas de conversão, potência instalada e economia gerada',
  },
  financeiro: {
    title: 'Gestão Financeira',
    subtitle: 'Controle de fluxo de caixa, comissões e financiamentos solares',
  },
  personalizacao: {
    title: 'Personalização da Conta',
    subtitle: 'Motor de cores do SaaS, identidade visual e temas do sistema',
  },
  'pdf-customizacoes': {
    title: 'Customizações do PDF',
    subtitle: 'Templates de capa, cabeçalhos, logos e layout dos relatórios',
  },
};

export const Topbar: React.FC<TopbarProps> = ({
  activePage,
  theme,
  onOpenMobileMenu,
  onOpenQuickAdd,
  onOpenGitHub,
  onOpenGitHubModal,
  onOpenHelp,
  onOpenNewProposal,
  searchQuery = '',
  onSearchChange,
}) => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState(searchQuery);

  const handleGitHubClick = onOpenGitHub || onOpenGitHubModal;
  const info = PAGE_TITLES[activePage] || {
    title: 'Sol Amigo Pro',
    subtitle: 'SaaS Fotovoltaico',
  };

  return (
    <header
      id="app-topbar"
      className="h-14 border-b border-[#30363D] flex items-center justify-between px-4 md:px-6 bg-[#161B22] text-[#C9D1D9] shrink-0 select-none z-30 sticky top-0"
    >
      {/* Left: Hamburger & Breadcrumb Repo Hierarchy */}
      <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
        <button
          id="topbar-mobile-menu-btn"
          onClick={onOpenMobileMenu}
          className="md:hidden p-1.5 rounded bg-[#21262D] border border-[#30363D] text-[#8B949E] hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="bg-[#21262D] border border-[#30363D] p-1.5 rounded hidden sm:flex items-center justify-center text-[#8B949E]">
          <Sun className="w-4 h-4 text-amber-400" />
        </div>

        {/* GitHub breadcrumb layout */}
        <div className="flex items-center text-xs md:text-sm font-medium truncate">
          <span
            onClick={handleGitHubClick}
            className="text-[#8B949E] hover:text-blue-400 cursor-pointer hidden lg:inline"
          >
            github.com
          </span>
          <span className="mx-2 text-[#484F58] hidden lg:inline">/</span>
          <span
            onClick={handleGitHubClick}
            className="text-[#8B949E] hover:text-blue-400 cursor-pointer hidden sm:inline"
          >
            solar-tech-inc
          </span>
          <span className="mx-2 text-[#484F58] hidden sm:inline">/</span>
          <span className="text-white font-semibold truncate flex items-center gap-1.5">
            sol-amigo-pro
          </span>
        </div>

        <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full border border-[#30363D] text-[10px] uppercase font-bold text-[#8B949E] tracking-wider">
          Public
        </span>

        {/* Page Context Badge */}
        <div className="hidden xl:flex items-center gap-1.5 pl-3 border-l border-[#30363D] text-xs text-[#8B949E]">
          <span className="text-[#484F58]">::</span>
          <span className="text-white font-medium">{info.title}</span>
        </div>
      </div>

      {/* Right: Actions, Search, Status & Notifications */}
      <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
        {/* Live Syncing status pill */}
        <button
          onClick={handleGitHubClick}
          className="bg-[#238636] hover:bg-[#2EA043] text-white px-2.5 md:px-3 py-1.5 rounded-md text-xs font-semibold flex items-center cursor-pointer transition-colors shadow-xs"
          title="Sincronização em tempo real do repositório"
        >
          <span className="mr-2 hidden sm:inline">Syncing...</span>
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </button>

        {/* Quick New Proposal action */}
        <button
          id="topbar-new-proposal-btn"
          onClick={onOpenNewProposal || onOpenQuickAdd}
          className="hidden sm:flex items-center gap-1.5 bg-[#21262D] border border-[#30363D] text-[#C9D1D9] hover:text-white hover:bg-[#30363D] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nova Proposta</span>
        </button>

        {/* Global Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 text-[#8B949E] absolute left-2.5 pointer-events-none" />
          <input
            type="search"
            value={searchQuery || internalQuery}
            onChange={(e) => {
              setInternalQuery(e.target.value);
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            placeholder="Buscar..."
            className="w-36 lg:w-48 h-8 pl-8 pr-7 text-xs bg-[#0D1117] border border-[#30363D] rounded-md text-[#C9D1D9] placeholder:text-[#8B949E] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
          />
          <kbd className="absolute right-2 text-[9px] font-mono text-[#8B949E] bg-[#161B22] border border-[#30363D] px-1 py-0.2 rounded">
            /
          </kbd>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="topbar-notifications-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-1.5 bg-[#21262D] border border-[#30363D] rounded-md text-[#C9D1D9] hover:text-white hover:bg-[#30363D] transition-colors"
            aria-label="Ver notificações"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 text-white text-[8.5px] font-extrabold flex items-center justify-center border border-[#161B22]">
              3
            </span>
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-[#C9D1D9]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#30363D]">
                <span className="font-semibold text-xs text-white">
                  Telemetry & Notifications
                </span>
                <span className="text-[10px] text-blue-400 hover:underline font-medium cursor-pointer">
                  Marcar lidas
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">
                      Proposta Aprovada!
                    </p>
                    <p className="text-[11px] text-[#8B949E]">
                      Fazenda Santa Rita aprovou o projeto de 28.08 kWp (R$ 98.500).
                    </p>
                    <span className="text-[9px] font-mono text-emerald-400 mt-1 block">
                      há 15 min
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-start gap-2.5">
                  <Sun className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">
                      Homologação CPFL Protocolada
                    </p>
                    <p className="text-[11px] text-[#8B949E]">
                      Parecer de acesso solicitado para Auto Posto Alvorada.
                    </p>
                    <span className="text-[9px] font-mono text-blue-400 mt-1 block">
                      há 2 horas
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#1C2128] border border-[#30363D] flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">
                      Repositório Sincronizado
                    </p>
                    <p className="text-[11px] text-[#8B949E]">
                      Connected to github.com/lealt97/sol-amigo-pro (main).
                    </p>
                    <span className="text-[9px] font-mono text-[#8B949E] mt-1 block">
                      hoje às 07:15
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Help Modal Trigger */}
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
