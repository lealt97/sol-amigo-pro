import { ThemeConfig, PdfSettingsConfig } from '../types';

export const THEME_STORAGE_KEY = 'solamigo.theme.v2';

// Paleta padrão do sistema Sol Amigo Pro.
// Internamente, background = Cor Neutra e accent = Cor Auxiliar.
export const DEFAULT_THEME: ThemeConfig = {
  primary: '#183956',
  secondary: '#0076DD',
  background: '#0E2337',
  accent: '#B4BF8A',
};

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sol-amigo',
    name: 'Sol Amigo',
    description: 'Paleta oficial padrão',
    theme: { ...DEFAULT_THEME },
  },
  {
    id: 'sol-amigo-noite',
    name: 'Sol Amigo Noite',
    description: 'Azul profundo com destaque solar',
    theme: {
      primary: '#0E2337',
      secondary: '#64B0F3',
      background: '#183956',
      accent: '#FACB5C',
    },
  },
  {
    id: 'solar-claro',
    name: 'Solar Claro',
    description: 'Interface clara e luminosa',
    theme: {
      primary: '#183956',
      secondary: '#64B0F3',
      background: '#F6F8FB',
      accent: '#FACB5C',
    },
  },
  {
    id: 'verde-tecnico',
    name: 'Verde Técnico',
    description: 'Verde da marca com azul de apoio',
    theme: {
      primary: '#183956',
      secondary: '#B4BF8A',
      background: '#F4F6F0',
      accent: '#0076DD',
    },
  },
  {
    id: 'azul-pro',
    name: 'Azul Pro',
    description: 'Azul intenso com contraste limpo',
    theme: {
      primary: '#0076DD',
      secondary: '#183956',
      background: '#F6F8FB',
      accent: '#DEC488',
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

export function loadSavedTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        primary: parsed.primary || DEFAULT_THEME.primary,
        secondary: parsed.secondary || DEFAULT_THEME.secondary,
        background: parsed.background || DEFAULT_THEME.background,
        accent: parsed.accent || DEFAULT_THEME.accent,
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
  root.style.setProperty('--neutral-fg', getContrastFg(theme.background));

  root.style.setProperty('--auxiliary', theme.accent);
  root.style.setProperty('--auxiliary-fg', getContrastFg(theme.accent));

  // Aliases mantidos para compatibilidade com componentes existentes.
  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--accent', theme.accent);

  document.body.style.backgroundColor = theme.background;
  document.body.style.color = getContrastFg(theme.background);
}
