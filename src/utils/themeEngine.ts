import { ThemeConfig, PdfSettingsConfig } from '../types';

export const DEFAULT_THEME: ThemeConfig = {
  primary: '#161B22',
  secondary: '#238636',
  accent: '#58A6FF',
  background: '#0D1117',
};

export const DEFAULT_PDF_SETTINGS: PdfSettingsConfig = {
  template: 'Modelo 01',
  useAccountColors: true,
  primary: '#161B22',
  secondary: '#238636',
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
  // YIQ ratio for optimal readability
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#0F172A' : '#FFFFFF';
}

export function loadSavedTheme(): ThemeConfig {
  try {
    const saved = localStorage.getItem('solamigo.theme');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        primary: parsed.primary || DEFAULT_THEME.primary,
        secondary: parsed.secondary || DEFAULT_THEME.secondary,
        accent: parsed.accent || DEFAULT_THEME.accent,
        background: parsed.background || DEFAULT_THEME.background,
      };
    }
  } catch (e) {
    console.error('Failed to load theme from localStorage', e);
  }
  return { ...DEFAULT_THEME };
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
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--bg', theme.background);
  document.body.style.backgroundColor = theme.background;
}
