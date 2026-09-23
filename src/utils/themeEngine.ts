import { ThemeConfig, PdfSettingsConfig } from '../types';

export const THEME_STORAGE_KEY = 'solamigo.theme.v2';
export const DISABLED_OPACITY = 0.38;

// Paleta padrão do sistema Sol Amigo Pro.
// Internamente, background = Cor Neutra e accent = Cor Auxiliar.
export const DEFAULT_THEME: ThemeConfig = {
  primary: '#183956',
  secondary: '#0076DD',
  background: '#0E2337',
  accent: '#B4BF8A',
  border: '#35536E',
  text: '#FFFFFF',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sol-amigo-noite',
    name: 'Sol Amigo Noite',
    description: 'Azul profundo oficial com destaque solar dourado',
    theme: {
      primary: '#0E2337',
      secondary: '#0076DD',
      background: '#183956',
      accent: '#FACB5C',
      border: '#35536E',
      text: '#FFFFFF',
    },
  },
  {
    id: 'solar-claro',
    name: 'Solar Claro',
    description: 'Ambiente claro com superfícies brancas, bordas douradas e fundo ardósia suave',
    theme: {
      primary: '#FFFFFF',
      secondary: '#0066CC',
      background: '#C4CFD9',
      accent: '#DEC488',
      border: '#FACB5C',
      text: '#072444',
    },
  },
  {
    id: 'eco-verde',
    name: 'Eco Verde',
    description: 'Harmonia bio-solar em tons de verde folha, musgo e oliva com fonte floresta profunda',
    theme: {
      primary: '#83B66D',
      secondary: '#167939',
      background: '#4E9758',
      accent: '#759405',
      border: '#A7D7B9',
      text: '#062817',
    },
  },
  {
    id: 'azul-pro',
    name: 'Azul Pro',
    description: 'Vários tons de azul com fundo petróleo, superfícies marinho e fonte ouro champanhe',
    theme: {
      primary: '#061F38',
      secondary: '#005FA8',
      background: '#003757',
      accent: '#48B3FF',
      border: '#0C4573',
      text: '#DEC488',
    },
  },
  {
    id: 'verde-tecnico',
    name: 'Verde Técnico',
    description: 'Fundo verde escuro nobre com acabamentos ecológicos e técnicos de engenharia',
    theme: {
      primary: '#163527',
      secondary: '#22C55E',
      background: '#0D2318',
      accent: '#86EFAC',
      border: '#264F3B',
      text: '#F0FDF4',
    },
  },
  {
    id: 'deluxe',
    name: 'Deluxe',
    description: 'Grafite e preto acetinado com acabamento dourado nobre',
    theme: {
      primary: '#161922',
      secondary: '#C6A15B',
      background: '#0D0F15',
      accent: '#E7C77D',
      border: '#363B48',
      text: '#F8FAFC',
    },
  },
  {
    id: 'sofisticado',
    name: 'Sofisticado',
    description: 'Luxo executivo em preto ônix nobre, ouro reluzente e prata metálica',
    theme: {
      primary: '#14161A',
      secondary: '#D4AF37',
      background: '#0B0C0E',
      accent: '#C5CBD3',
      border: '#2E333D',
      text: '#F8FAFC',
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Design escandinavo moderno com superfícies ardósia clara, grafite e azul safira',
    theme: {
      primary: '#CBD5E1',
      secondary: '#2563EB',
      background: '#EDF2F7',
      accent: '#0284C7',
      border: '#93969A',
      text: '#0F172A',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Tema escuro moderno com azul elétrico e alto contraste',
    theme: {
      primary: '#1E293B',
      secondary: '#3B82F6',
      background: '#0F172A',
      accent: '#38BDF8',
      border: '#334155',
      text: '#F8FAFC',
    },
  },
  {
    id: 'cinza-metalico',
    name: 'Cinza Metálico',
    description: 'Graduações de cinza puro: titânio, platina, aço e grafite',
    theme: {
      primary: '#2B2E33',
      secondary: '#64748B',
      background: '#181A1D',
      accent: '#94A3B8',
      border: '#454A52',
      text: '#F8FAFC',
    },
  },
  {
    id: 'aurora-magenta',
    name: 'Aurora Magenta',
    description: 'Universo rosa com fundo rosewood profundo e tons de pétala e magenta',
    theme: {
      primary: '#3F122B',
      secondary: '#E11D48',
      background: '#2B0A1C',
      accent: '#FB7185',
      border: '#5C1D41',
      text: '#FFF1F2',
    },
  },
  {
    id: 'brasa-solar',
    name: 'Brasa Solar',
    description: 'Energia incandescente com contraste marcante de carvão e fogo solar',
    theme: {
      primary: '#1C1917',
      secondary: '#F97316',
      background: '#0C0A09',
      accent: '#FB923C',
      border: '#44403C',
      text: '#FAFAF9',
    },
  },
];

export const DEFAULT_PDF_SETTINGS: PdfSettingsConfig = {
  template: 'Modelo 01',
  useAccountColors: true,
  primary: '#183956',
  secondary: '#0076DD',
  font: 'Inter',
  showLogo: true,
  showCoverPhoto: true,
  showFinancial: true,
  showEquipment: true,
  showEnvironmental: true,
  showFooter: true,
};

export function getContrastFg(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#ffffff';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0F172A' : '#FFFFFF';
}

export function isDarkBackground(hex: string): boolean {
  if (!hex) return true;
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return true;

  const toLinear = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };

  const r = toLinear(parseInt(clean.slice(0, 2), 16));
  const g = toLinear(parseInt(clean.slice(2, 4), 16));
  const b = toLinear(parseInt(clean.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  const rYiq = parseInt(clean.slice(0, 2), 16);
  const gYiq = parseInt(clean.slice(2, 4), 16);
  const bYiq = parseInt(clean.slice(4, 6), 16);
  const yiq = (rYiq * 299 + gYiq * 587 + bYiq * 114) / 1000;

  return luminance < 0.42 && yiq < 150;
}

export interface BadgeColorStyle {
  color: string;
  backgroundColor: string;
  borderColor: string;
}

/**
 * Retorna as cores contrastantes para as tags LEAD e CLIENTE.
 * Segue o mesmo padrão dinâmico da logo da plataforma:
 * - Fundo escuro -> usa cor clara (alta visibilidade e legibilidade)
 * - Fundo claro -> usa cor escura (alto contraste sobre superfícies claras)
 */
export function getLeadClienteBadgeStyle(isLead: boolean, surfaceBg: string): BadgeColorStyle {
  const isDark = isDarkBackground(surfaceBg);

  if (isDark) {
    // Quando o fundo é escuro, usa-se cor clara
    if (isLead) {
      return {
        color: '#38BDF8', // azul celeste luminoso
        backgroundColor: 'rgba(56, 189, 248, 0.16)',
        borderColor: 'rgba(56, 189, 248, 0.32)',
      };
    } else {
      return {
        color: '#34D399', // verde esmeralda luminoso
        backgroundColor: 'rgba(52, 211, 153, 0.16)',
        borderColor: 'rgba(52, 211, 153, 0.32)',
      };
    }
  } else {
    // Quando o fundo é claro, usa-se cor escura
    if (isLead) {
      return {
        color: '#1D4ED8', // azul royal escuro profundo
        backgroundColor: 'rgba(29, 78, 216, 0.12)',
        borderColor: 'rgba(29, 78, 216, 0.26)',
      };
    } else {
      return {
        color: '#047857', // verde floresta escuro profundo
        backgroundColor: 'rgba(4, 120, 87, 0.12)',
        borderColor: 'rgba(4, 120, 87, 0.26)',
      };
    }
  }
}

export function loadSavedTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed.background === '#EBF5ED' ||
        parsed.background === '#97C08C' ||
        parsed.primary === '#244E3A' ||
        (parsed.background === '#4E9758' && parsed.primary === '#83B66D')
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'eco-verde')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (parsed.background === '#EEF2F6' || parsed.background === '#BFC6CD' || parsed.primary === '#2F343B' || (parsed.secondary === '#38BDF8' && parsed.primary === '#242A34')) {
        const updated = THEME_PRESETS.find((p) => p.id === 'cinza-metalico')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (parsed.background === '#FDF2F7' || parsed.background === '#F5D0E0' || (parsed.secondary === '#E11D48' && parsed.primary === '#FFFFFF')) {
        const updated = THEME_PRESETS.find((p) => p.id === 'aurora-magenta')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (
        (parsed.background === '#EAF2F8' && parsed.primary === '#FFFFFF') ||
        (parsed.background === '#E8F3FD' && (parsed.primary === '#0058A8' || parsed.primary === '#FFFFFF')) ||
        (parsed.primary === '#FFFFFF' && parsed.secondary === '#0066CC' && (parsed.border === '#BFDBFE' || parsed.accent === '#F59E0B' || parsed.background === '#E8F3FD')) ||
        (parsed.background === '#C4CFD9' && parsed.primary === '#FFFFFF')
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'solar-claro')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (
        (parsed.background === '#EDF5EE' && parsed.primary === '#FFFFFF') ||
        (parsed.background === '#E2F3E9' && parsed.primary === '#0F472B') ||
        (parsed.background === '#E2F3E9' && parsed.primary === '#FFFFFF') ||
        (parsed.secondary === '#10B981' && parsed.text === '#062817') ||
        (parsed.border === '#A7D7B9' && parsed.background === '#E2F3E9') ||
        (parsed.primary === '#163527' && parsed.background === '#0D2318')
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'verde-tecnico')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (
        (parsed.background === '#E8F1F8' && parsed.primary === '#FFFFFF' && parsed.secondary === '#0076DD') ||
        (parsed.background === '#E1EDF9' && parsed.primary === '#0A2540') ||
        (parsed.background === '#EEF4F8' && parsed.primary === '#0B2545') ||
        (parsed.background === '#0085D1' && parsed.text === '#DEC488') ||
        (parsed.primary === '#061F38' && parsed.secondary === '#005FA8')
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'azul-pro')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (
        parsed.background === '#EFE8DF' ||
        parsed.background === '#F5EFE9' ||
        (parsed.primary === '#1C1917' && (parsed.secondary === '#B45309' || parsed.accent === '#D97706'))
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'sofisticado')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      if (
        (parsed.background === '#F0F4F8' && parsed.primary === '#FFFFFF') ||
        (parsed.background === '#EDF2F7' && (parsed.primary === '#1E293B' || parsed.primary === '#FFFFFF' || parsed.border === '#CBD5E1')) ||
        (parsed.primary === '#CBD5E1' && parsed.background === '#EDF2F7')
      ) {
        const updated = THEME_PRESETS.find((p) => p.id === 'clean')!.theme;
        saveTheme(updated);
        return { ...updated };
      }
      return {
        primary: parsed.primary || DEFAULT_THEME.primary,
        secondary: parsed.secondary || DEFAULT_THEME.secondary,
        background: parsed.background || DEFAULT_THEME.background,
        accent: parsed.accent || DEFAULT_THEME.accent,
        border: parsed.border || DEFAULT_THEME.border,
        text: parsed.text || DEFAULT_THEME.text,
      };
    }
  } catch (e) {
    console.error('Failed to load theme from localStorage', e);
  }
  return { ...DEFAULT_THEME };
}

export function saveTheme(theme: ThemeConfig) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
}

export function loadSavedPdfSettings(): PdfSettingsConfig {
  try {
    const saved = localStorage.getItem('solamigo.pdf');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PDF_SETTINGS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Failed to load PDF settings from localStorage', e);
  }
  return { ...DEFAULT_PDF_SETTINGS };
}

export function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;

  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-fg', getContrastFg(theme.primary));

  root.style.setProperty('--secondary', theme.secondary);
  root.style.setProperty('--secondary-fg', getContrastFg(theme.secondary));

  root.style.setProperty('--neutral', theme.background);
  root.style.setProperty('--neutral-fg', theme.text);

  root.style.setProperty('--auxiliary', theme.accent);
  root.style.setProperty('--auxiliary-fg', getContrastFg(theme.accent));

  root.style.setProperty('--border', theme.border);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--disabled-color', theme.text);
  root.style.setProperty('--disabled-opacity', String(DISABLED_OPACITY));

  // Estados interativos sincronizados com o tema ativo
  root.style.setProperty('--button-filled-hover-bg', `color-mix(in srgb, ${theme.secondary} 88%, #ffffff)`);
  root.style.setProperty('--button-filled-hover-fg', getContrastFg(theme.secondary));
  root.style.setProperty('--button-outline-hover-bg', theme.secondary);
  root.style.setProperty('--button-outline-hover-fg', getContrastFg(theme.secondary));

  // Aliases mantidos para compatibilidade com componentes existentes.
  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--surface', theme.primary);
  root.style.setProperty('--surface-fg', getContrastFg(theme.primary));
  root.style.setProperty('--surface-alt', theme.background);
  root.style.setProperty('--surface-alt-fg', theme.text);
  root.style.setProperty('--elevated', theme.primary);

  // Escalas de transparência baseadas na cor da fonte ativa com alta legibilidade
  root.style.setProperty('--muted', `color-mix(in srgb, ${theme.text} 82%, transparent)`);
  root.style.setProperty('--dim', `color-mix(in srgb, ${theme.text} 68%, transparent)`);

  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
}
