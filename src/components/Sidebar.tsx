import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UsersRound,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { PageKey, ThemeConfig } from '../types';
import { getContrastFg } from '../utils/themeEngine';
import { supabase } from '../lib/supabase';
import { BrandLogo } from './BrandLogo';

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

type SidebarProfile = {
  fullName: string;
  company: string;
  photoUrl: string;
};

const NAV_ITEMS: NavItemDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'clientes', label: 'Clientes', icon: UsersRound },
];

function mixHex(base: string, target: string, amount: number): string {
  const normalize = (hex: string) => hex.replace('#', '');
  const a = normalize(base);
  const b = normalize(target);
  if (!/^[0-9a-fA-F]{6}$/.test(a) || !/^[0-9a-fA-F]{6}$/.test(b)) return base;

  const mixChannel = (start: number, end: number) => Math.round(start + (end - start) * amount);
  const result = [0, 2, 4]
    .map((index) => {
      const start = parseInt(a.slice(index, index + 2), 16);
      const end = parseInt(b.slice(index, index + 2), 16);
      return mixChannel(start, end).toString(16).padStart(2, '0');
    })
    .join('');
  return `#${result}`;
}

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Usuário';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SA';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  onToggleCollapse,
  theme,
  mobileOpen,
  onCloseMobile,
}) => {
  const settingsPages: PageKey[] = ['perfil', 'personalizacao', 'pdf-customizacoes', 'seguranca', 'area-risco'];
  const [settingsOpen, setSettingsOpen] = useState(settingsPages.includes(activePage));
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<SidebarProfile>({
    fullName: '',
    company: '',
    photoUrl: '',
  });
  const isSettingsActive = settingsPages.includes(activePage);

  const navigateFn = onSelectPage || onNavigate || (() => {});
  const toggleCollapseFn = onToggleCollapsed || onToggleCollapse || (() => {});

  const sidebarBg = theme.primary;
  const sidebarFg = getContrastFg(sidebarBg);
  const sidebarIsDark = sidebarFg === '#FFFFFF';
  const panelBg = mixHex(sidebarBg, sidebarIsDark ? '#000000' : '#FFFFFF', sidebarIsDark ? 0.14 : 0.18);
  const subtleBg = mixHex(sidebarBg, sidebarIsDark ? '#FFFFFF' : '#000000', sidebarIsDark ? 0.08 : 0.05);
  const borderColor = theme.border;
  const activeFg = getContrastFg(theme.secondary);
  const mutedOpacity = sidebarIsDark ? 0.68 : 0.72;
  const hoverClass = sidebarIsDark ? 'hover:bg-white/10' : 'hover:bg-black/5';
  const shortName = getShortName(profile.fullName);
  const displayName = shortName.toLocaleLowerCase('pt-BR') === 'renan hora' ? 'Renan Leal' : shortName;
  const companyName = profile.company.trim() || 'Conta autenticada';
  const initials = displayName === 'Renan Leal' ? 'RL' : getInitials(profile.fullName);

  useEffect(() => {
    let mounted = true;

    const syncProfile = (user: any) => {
      if (!mounted || !user) return;
      const metadata = user.user_metadata ?? {};
      setProfile({
        fullName: String(metadata.full_name ?? ''),
        company: String(metadata.company ?? ''),
        photoUrl: String(metadata.profile_image_url ?? ''),
      });
    };

    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      syncProfile(data.user);
    };

    void loadProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) syncProfile(session.user);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleNavClick = (key: PageKey) => {
    navigateFn(key);
    if (window.innerWidth < 768) onCloseMobile();
  };

  const handleSettingsToggle = () => {
    if (collapsed) {
      toggleCollapseFn();
      setSettingsOpen(true);
    } else {
      setSettingsOpen(!settingsOpen);
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setSigningOut(false);
      window.alert('Não foi possível sair da conta. Tente novamente.');
    }
  };

  return (
    <>
      {mobileOpen && <div id="mobile-backdrop" onClick={onCloseMobile} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden" />}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-200 ease-in-out select-none border-r ${collapsed ? 'w-[64px]' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ backgroundColor: sidebarBg, color: sidebarFg, borderColor }}
      >
        <button
          id="sidebar-toggle-btn"
          onClick={toggleCollapseFn}
          className="absolute -right-3 top-4 z-60 hidden md:flex items-center justify-center w-6 h-6 rounded-md transition-all shadow-sm"
          style={{ backgroundColor: panelBg, color: sidebarFg, border: `1px solid ${borderColor}` }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>

        <div id="sidebar-brand" className={`h-16 flex items-center overflow-hidden border-b ${collapsed ? 'justify-center px-1' : 'px-4'}`} style={{ backgroundColor: panelBg, borderColor }}>
          {collapsed ? (
            <BrandLogo orientation="vertical" backgroundColor={panelBg} className="w-[46px] h-[46px] object-contain" />
          ) : (
            <BrandLogo orientation="horizontal" backgroundColor={panelBg} className="w-[184px] max-h-[46px] object-contain object-left" />
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
                  className={`w-full h-9 flex items-center gap-2.5 px-2.5 rounded-md text-xs font-medium transition-all group ${collapsed ? 'justify-center px-0' : ''} ${isActive ? 'font-semibold' : hoverClass}`}
                  style={isActive ? { backgroundColor: theme.secondary, color: activeFg, boxShadow: `inset 0 0 0 1px ${borderColor}` } : { color: sidebarFg, opacity: mutedOpacity }}
                >
                  <div className="w-4 h-4 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
                  {!collapsed && <span className="truncate text-left">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div id="sidebar-bottom-panel" className="p-3 border-t space-y-1 shrink-0" style={{ backgroundColor: panelBg, borderColor }}>
          <div>
            <button
              id="nav-item-settings-toggle"
              onClick={handleSettingsToggle}
              title={collapsed ? 'Configurações' : undefined}
              className={`w-full h-8 flex items-center gap-2.5 px-2 rounded-md text-xs font-medium transition-all ${collapsed ? 'justify-center px-0' : ''} ${!isSettingsActive ? hoverClass : ''}`}
              style={isSettingsActive ? { backgroundColor: theme.secondary, color: activeFg } : { color: sidebarFg, opacity: mutedOpacity }}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0"><Settings className={`w-4 h-4 ${settingsOpen ? 'rotate-45' : ''} transition-transform duration-200`} /></div>
              {!collapsed && (
                <>
                  <span className="truncate text-left flex-1">Configurações</span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`} />
                </>
              )}
            </button>

            {!collapsed && settingsOpen && (
              <div id="settings-submenu" className="mt-1 ml-4 pl-2 border-l space-y-1" style={{ borderColor }}>
                {[
                  ['perfil', 'Perfil'],
                  ['personalizacao', 'Personalização da conta'],
                  ['pdf-customizacoes', 'Customizações do PDF'],
                  ['seguranca', 'Segurança'],
                  ['area-risco', 'Área de risco'],
                ].map(([key, label]) => {
                  const isActive = activePage === key;
                  return (
                    <button
                      key={key}
                      id={`subnav-${key}`}
                      onClick={() => handleNavClick(key as PageKey)}
                      className={`w-full text-left py-1.5 px-2 rounded text-[11px] font-medium transition-colors ${!isActive ? hoverClass : ''}`}
                      style={isActive ? { backgroundColor: subtleBg, color: sidebarFg } : { color: sidebarFg, opacity: mutedOpacity }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div id="sidebar-profile-card" className={`mt-2 p-2 rounded-md border flex items-center gap-2 overflow-hidden ${collapsed ? 'justify-center p-1.5' : ''}`} style={{ backgroundColor: subtleBg, borderColor }}>
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ backgroundColor: theme.accent, color: getContrastFg(theme.accent) }}
              title={displayName}
            >
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                <span className="text-[11px] font-semibold leading-tight truncate" title={displayName}>{displayName}</span>
                <span className="text-[9px] leading-tight truncate" style={{ opacity: 0.62 }} title={companyName}>{companyName}</span>
              </div>
            )}
          </div>

          <button
            id="sidebar-signout-btn"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            title={collapsed ? 'Sair da conta' : undefined}
            className={`w-full h-8 flex items-center gap-2.5 px-2 rounded-md text-xs font-medium transition-all ${collapsed ? 'justify-center px-0' : ''} ${hoverClass}`}
            style={{ color: sidebarFg, opacity: signingOut ? 0.45 : mutedOpacity }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{signingOut ? 'Saindo...' : 'Sair da conta'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
