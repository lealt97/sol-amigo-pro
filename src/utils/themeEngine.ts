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
    description: 'Azul profundo com destaque solar',
    theme: {
      primary: '#0E2337',
      secondary: '#64B0F3',
      background: '#183956',
      accent: '#FACB5C',
      border: '#35536E',
      text: '#FFFFFF',
    },
  },
  {
    id: 'solar-claro',
    name: 'Solar Claro',
    description: 'Navegação branca com fundo azul suave',
    theme: {
      primary: '#FFFFFF',
      secondary: '#64B0F3',
      background: '#C9DDEA',
      accent: '#FACB5C',
      border: '#9FB9CC',
      text: '#183956',
    },
  },
  {
    id: 'verde-tecnico',
    name: 'Verde Técnico',
    description: 'Verde da marca com azul de apoio',
    theme: {
      primary: '#183956',
      secondary: '#B4BF8A',
      background: '#CAD9C5',
      accent: '#0076DD',
      border: '#8DA785',
      text: '#183956',
    },
  },
  {
    id: 'azul-pro',
    name: 'Azul Pro',
    description: 'Azul intenso com contraste limpo',
    theme: {
      primary: '#0076DD',
      secondary: '#183956',
      background: '#C8DCEB',
      accent: '#DEC488',
      border: '#8DB7D4',
      text: '#183956',
    },
  },
  {
    id: 'eco-verde',
    name: 'Eco Verde',
    description: 'Verdes naturais com aparência sustentável',
    theme: {
      primary: '#244E3A',
      secondary: '#4F8A68',
      background: '#97C08C',
      accent: '#B8C88A',
      border: '#557C50',
      text: '#18392B',
    },
  },
  {
    id: 'deluxe',
    name: 'Deluxe',
    description: 'Azul escuro com acabamento dourado',
    theme: {
      primary: '#111827',
      secondary: '#C6A15B',
      background: '#0B1220',
      accent: '#E7C77D',
      border: '#4B5563',
      text: '#F8FAFC',
    },
  },
  {
    id: 'sofisticado',
    name: 'Sofisticado',
    description: 'Tons profundos e neutros com contraste elegante',
    theme: {
      primary: '#2D3142',
      secondary: '#6B7280',
      background: '#CEC5B8',
      accent: '#A88F70',
      border: '#9C9182',
      text: '#2D3142',
    },
  },
  {
    id: 'clean',
    name: 'Clean',
    description: 'Navegação branca com fundo cinza azulado',
    theme: {
      primary: '#FFFFFF',
      secondary: '#0EA5E9',
      background: '#CDD8DE',
      accent: '#A7F3D0',
      border: '#A8B6C0',
      text: '#334155',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Tema escuro moderno com azul de destaque',
    theme: {
      primary: '#0F172A',
      secondary: '#2563EB',
      background: '#020617',
      accent: '#38BDF8',
      border: '#334155',
      text: '#E2E8F0',
    },
  },
  {
    id: 'cinza-metalico',
    name: 'Cinza Metálico',
    description: 'Tons de grafite, aço e prata com aparência tecnológica',
    theme: {
      primary: '#2F343B',
      secondary: '#6F7882',
      background: '#BFC6CD',
      accent: '#AAB2BC',
      border: '#7B848E',
      text: '#2F343B',
    },
  },
  {
    id: 'aurora-magenta',
    name: 'Aurora Magenta',
    description: 'Elegância e personalidade com tons de magenta e rosa floral',
    theme: {
      primary: '#4A0E2E',
      secondary: '#E11D48',
      background: '#F5D0E0',
      accent: '#F472B6',
      border: '#D48BAA',
      text: '#3D0B26',
    },
  },
  {
    id: 'brasa-solar',
    name: 'Brasa Solar',
    description: 'Energia incandescente com contraste marcante de preto e grafite',
    theme: {
      primary: '#121214',
      secondary: '#F97316',
      background: '#1E1E24',
      accent: '#FB923C',
      border: '#44444C',
      text: '#F4F4F5',
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

  // Aliases mantidos para compatibilidade com componentes existentes.
  root.style.setProperty('--bg', theme.background);
  root.style.setProperty('--accent', theme.accent);

  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
}
