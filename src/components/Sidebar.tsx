import React, { useState } from 'react';
import {
  LayoutDashboard,
  Target,
  Users,
  Building2,
  FileText,
  FileCheck2,
  Package,
  CheckSquare,
  BarChart3,
  DollarSign,
  Settings,
  ChevronRight,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';

interface SidebarProps {
  activePage: PageKey;
  onSelectPage?: (page: PageKey) => void;
  onNavigate?: (page: PageKey) => void;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onToggleCollapse?: () => void;
  theme: ThemeConfig;
  onOpenHelp?: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItemDef {
  key: PageKey;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItemDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'oportunidades', label: 'Oportunidades', icon: Target },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'empresas', label: 'Empresas', icon: Building2 },
  { key: 'propostas', label: 'Propostas', icon: FileText },
  { key: 'contratos', label: 'Contratos', icon: FileCheck2 },
  { key: 'produtos', label: 'Produtos', icon: Package },
  { key: 'tarefas', label: 'Tarefas', icon: CheckSquare },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  onToggleCollapse,
  theme,
  onOpenHelp,
  mobileOpen,
  onCloseMobile,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(
    activePage === 'personalizacao' || activePage === 'pdf-customizacoes'
  );

  const isSettingsActive =
    activePage === 'personalizacao' || activePage === 'pdf-customizacoes';

  const navigateFn = onSelectPage || onNavigate || (() => {});
  const toggleCollapseFn = onToggleCollapsed || onToggleCollapse || (() => {});

  const handleNavClick = (key: PageKey) => {
    navigateFn(key);
    if (window.innerWidth < 768) {
      onCloseMobile();
    }
  };

  const handleSettingsToggle = () => {
    if (collapsed) {
      toggleCollapseFn();
      setSettingsOpen(true);
    } else {
      setSettingsOpen(!settingsOpen);
    }
  };

  return (
    <>
      {mobileOpen && (
        <div
          id="mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col text-[#C9D1D9] bg-[#0D1117] transition-all duration-200 ease-in-out select-none border-r border-[#30363D] ${
          collapsed ? 'w-[64px]' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <button
          id="sidebar-toggle-btn"
          onClick={onToggleCollapsed}
          className="absolute -right-3 top-4 z-60 hidden md:flex items-center justify-center w-6 h-6 rounded-md bg-[#21262D] text-[#C9D1D9] border border-[#30363D] hover:bg-[#30363D] hover:text-white transition-all shadow-sm"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5" />
          ) : (
            <PanelLeftClose className="w-3.5 h-3.5" />
          )}
        </button>

        <div
          id="sidebar-brand"
          className={`h-14 flex items-center gap-3 px-4 border-b border-[#30363D] bg-[#161B22] overflow-hidden ${
            collapsed ? 'justify-center px-2' : ''
          }`}
        >
          <div className="w-8 h-8 rounded-md bg-[#21262D] border border-[#30363D] flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-amber-400" />
          </div>

          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-white leading-tight">
                Sol Amigo Pro
              </span>
              <span className="text-[9px] uppercase tracking-wider font-mono text-[#8B949E]">
                v2.4.1 :: PRODUCTION
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 px-3 py-3 overflow-y-auto overflow-x-hidden">
          <nav id="sidebar-nav" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.key;
              return (
                <button
                  key={item.key}
                  id={`nav-item-${item.key}`}
                  onClick={() => handleNavClick(item.key)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-md text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-[#161B22] text-white border border-[#30363D] font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#161B22]'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-blue-400'
                          : 'text-[#8B949E] group-hover:text-[#C9D1D9]'
                      }`}
                    />
                  </div>
                  {!collapsed && (
                    <span className="truncate text-left">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div
          id="sidebar-bottom-panel"
          className="p-3 border-t border-[#30363D] bg-[#161B22] space-y-1 shrink-0"
        >
          <div>
            <button
              id="nav-item-settings-toggle"
              onClick={handleSettingsToggle}
              title={collapsed ? 'Configurações' : undefined}
              className={`w-full h-8 flex items-center gap-2.5 px-2 rounded-md text-xs font-medium transition-all ${
                isSettingsActive
                  ? 'bg-[#21262D] text-white border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                <Settings
                  className={`w-4 h-4 ${
                    settingsOpen ? 'rotate-45' : ''
                  } transition-transform duration-200`}
                />
              </div>
              {!collapsed && (
                <>
                  <span className="truncate text-left flex-1">Configurações</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-[#8B949E] transition-transform duration-200 ${
                      settingsOpen ? 'rotate-90' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {!collapsed && settingsOpen && (
              <div
                id="settings-submenu"
                className="mt-1 ml-4 pl-2 border-l border-[#30363D] space-y-1"
              >
                <button
                  id="subnav-personalizacao"
                  onClick={() => handleNavClick('personalizacao')}
                  className={`w-full text-left py-1 px-2 rounded text-[11px] font-medium transition-colors ${
                    activePage === 'personalizacao'
                      ? 'bg-[#21262D] text-blue-400 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
                  }`}
                >
                  Personalização da conta
                </button>
                <button
                  id="subnav-pdf-customizacoes"
                  onClick={() => handleNavClick('pdf-customizacoes')}
                  className={`w-full text-left py-1 px-2 rounded text-[11px] font-medium transition-colors ${
                    activePage === 'pdf-customizacoes'
                      ? 'bg-[#21262D] text-blue-400 font-semibold'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#21262D]'
                  }`}
                >
                  Customizações do PDF
                </button>
              </div>
            )}
          </div>

          <div
            id="sidebar-profile-card"
            className={`mt-2 p-2 rounded-md bg-[#0D1117] border border-[#30363D] flex items-center gap-2 ${
              collapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div
              className="w-6 h-6 rounded bg-orange-900/60 border border-orange-500 flex items-center justify-center text-[10px] font-bold text-orange-200 shrink-0"
              title="Rodrigo Leal (Admin)"
            >
              RL
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate min-w-0 flex-1">
                <span className="text-[11px] font-semibold text-[#C9D1D9] leading-tight truncate">
                  Rodrigo Leal
                </span>
                <span className="text-[9px] font-mono text-[#8B949E] truncate">
                  solar-admin (Write)
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
