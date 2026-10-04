import type { PdfSettingsConfig, ThemeConfig } from '../types';
import { normalizeSvgColor } from './pdfCoverEditor';

export interface PdfDocumentPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  primarySoft: string;
  secondarySoft: string;
  accentSoft: string;
  onPrimary: string;
  onSecondary: string;
  onAccent: string;
}

interface HslColor {
  h: number;
  s: number;
  l: number;
}

const hexToRgb = (value: string) => {
  const hex = normalizeSvgColor(value);
  if (!hex) return null;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
};

const rgbToHsl = (r: number, g: number, b: number): HslColor => {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === nr) h = 60 * (((ng - nb) / delta) % 6);
    else if (max === ng) h = 60 * ((nb - nr) / delta + 2);
    else h = 60 * ((nr - ng) / delta + 4);
  }

  if (h < 0) h += 360;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
};

const getHsl = (value: string): HslColor | null => {
  const rgb = hexToRgb(value);
  return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
};

const mixHex = (base: string, target: string, amount: number): string => {
  const a = hexToRgb(base);
  const b = hexToRgb(target);
  if (!a || !b) return base;
  const ratio = Math.min(1, Math.max(0, amount));
  const channel = (left: number, right: number) =>
    Math.round(left + (right - left) * ratio)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
};

const luminance = (value: string): number => {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;
  const normalized = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * normalized[0] + 0.7152 * normalized[1] + 0.0722 * normalized[2];
};

export const getReadableTextColor = (background: string): string =>
  luminance(background) > 0.5 ? '#0F172A' : '#FFFFFF';

interface PaletteCandidate {
  source: string;
  target: string;
  hsl: HslColor;
}

const collectCandidates = (settings: PdfSettingsConfig): PaletteCandidate[] =>
  Object.entries(settings.coverColors ?? {})
    .map(([source, target]) => {
      const normalizedSource = normalizeSvgColor(source);
      const normalizedTarget = normalizeSvgColor(target);
      const hsl = normalizedSource ? getHsl(normalizedSource) : null;
      if (!normalizedSource || !normalizedTarget || !hsl) return null;
      return {
        source: normalizedSource,
        target: normalizedTarget,
        hsl,
      };
    })
    .filter((item): item is PaletteCandidate => Boolean(item));

const pickPrimary = (candidates: PaletteCandidate[]) =>
  [...candidates]
    .filter(({ hsl }) => hsl.l <= 0.46)
    .sort((a, b) => a.hsl.l - b.hsl.l || b.hsl.s - a.hsl.s)[0];

const pickAccent = (candidates: PaletteCandidate[]) =>
  [...candidates]
    .filter(({ hsl }) => hsl.s >= 0.25 && hsl.h >= 24 && hsl.h <= 78)
    .sort((a, b) => b.hsl.s - a.hsl.s || b.hsl.l - a.hsl.l)[0];

const pickSecondary = (
  candidates: PaletteCandidate[],
  primary?: PaletteCandidate,
  accent?: PaletteCandidate
) =>
  [...candidates]
    .filter((candidate) => candidate !== primary && candidate !== accent)
    .filter(({ hsl }) => hsl.s >= 0.2)
    .sort((a, b) => b.hsl.s - a.hsl.s || Math.abs(0.5 - a.hsl.l) - Math.abs(0.5 - b.hsl.l))[0];

export const resolvePdfDocumentPalette = (
  settings: PdfSettingsConfig,
  theme: ThemeConfig
): PdfDocumentPalette => {
  const basePrimary = normalizeSvgColor(settings.useAccountColors ? theme.primary : settings.primary) || '#0E2337';
  const baseSecondary = normalizeSvgColor(settings.useAccountColors ? theme.secondary : settings.secondary) || '#0076DD';
  const baseAccent = normalizeSvgColor(theme.accent) || '#FACB5C';
  const candidates = collectCandidates(settings);

  const primaryCandidate = pickPrimary(candidates);
  const accentCandidate = pickAccent(candidates);
  const secondaryCandidate = pickSecondary(candidates, primaryCandidate, accentCandidate);

  const primary = primaryCandidate?.target || basePrimary;
  const secondary = secondaryCandidate?.target || baseSecondary;
  const accent = accentCandidate?.target || baseAccent;

  return {
    primary,
    secondary,
    accent,
    background: '#FFFFFF',
    primarySoft: mixHex(primary, '#FFFFFF', 0.90),
    secondarySoft: mixHex(secondary, '#FFFFFF', 0.90),
    accentSoft: mixHex(accent, '#FFFFFF', 0.84),
    onPrimary: getReadableTextColor(primary),
    onSecondary: getReadableTextColor(secondary),
    onAccent: getReadableTextColor(accent),
  };
};
