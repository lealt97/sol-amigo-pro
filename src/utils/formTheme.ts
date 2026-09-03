import type { FormColorMode, FormThemeColors } from '../types';

export const DEFAULT_FORM_PRIMARY = '#0076DD';
export const DEFAULT_FORM_SECONDARY = '#0E2337';
export const DEFAULT_FORM_SURFACE = '#F4F7FA';

export const FORM_THEME_COLOR_GROUPS = [
  {
    label: 'Estrutura',
    description: 'Fundo da página, caixa e cabeçalho.',
    fields: [
      ['pageBackground', 'Fundo da página'],
      ['cardBackground', 'Caixa do formulário'],
      ['headerBackground', 'Cabeçalho'],
    ],
  },
  {
    label: 'Textos',
    description: 'Título, apoio e conteúdo do formulário.',
    fields: [
      ['headerText', 'Texto do cabeçalho'],
      ['headerMutedText', 'Apoio do cabeçalho'],
      ['bodyText', 'Texto principal'],
      ['mutedText', 'Texto secundário'],
    ],
  },
  {
    label: 'Campos',
    description: 'Fundo, borda e texto dos campos.',
    fields: [
      ['inputBackground', 'Fundo dos campos'],
      ['inputBorder', 'Borda dos campos'],
      ['inputText', 'Texto dos campos'],
      ['consentBackground', 'Caixa de consentimento'],
    ],
  },
  {
    label: 'Ações e progresso',
    description: 'Botões e indicador das etapas.',
    fields: [
      ['primaryButtonBackground', 'Botão principal'],
      ['primaryButtonText', 'Texto do botão principal'],
      ['secondaryButtonBackground', 'Botão secundário'],
      ['secondaryButtonText', 'Texto do botão secundário'],
      ['progressActive', 'Etapa ativa'],
      ['progressInactive', 'Etapa inativa'],
    ],
  },
  {
    label: 'Mensagens',
    description: 'Confirmação e avisos de preenchimento.',
    fields: [
      ['successBackground', 'Fundo da confirmação'],
      ['successAccent', 'Destaque da confirmação'],
      ['errorBackground', 'Fundo do aviso'],
      ['errorAccent', 'Texto do aviso'],
    ],
  },
] as const satisfies ReadonlyArray<{
  label: string;
  description: string;
  fields: ReadonlyArray<readonly [keyof FormThemeColors, string]>;
}>;

const HEX_COLOR = /^#[0-9A-F]{6}$/i;

export const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_COLOR.test(value);

const toRgb = (hex: string) => ({
  red: Number.parseInt(hex.slice(1, 3), 16),
  green: Number.parseInt(hex.slice(3, 5), 16),
  blue: Number.parseInt(hex.slice(5, 7), 16),
});

const toHex = (value: number) => Math.round(Math.max(0, Math.min(255, value)))
  .toString(16)
  .padStart(2, '0');

export const mixHexColors = (foreground: string, background: string, foregroundWeight: number) => {
  const first = toRgb(isHexColor(foreground) ? foreground : DEFAULT_FORM_PRIMARY);
  const second = toRgb(isHexColor(background) ? background : DEFAULT_FORM_SURFACE);
  const weight = Math.max(0, Math.min(1, foregroundWeight));
  return `#${toHex(first.red * weight + second.red * (1 - weight))}${toHex(first.green * weight + second.green * (1 - weight))}${toHex(first.blue * weight + second.blue * (1 - weight))}`.toUpperCase();
};

const linearChannel = (channel: number) => {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (color: string) => {
  const { red, green, blue } = toRgb(isHexColor(color) ? color : DEFAULT_FORM_SECONDARY);
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
};

export const contrastRatio = (first: string, second: string) => {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
};

export const readableTextColor = (background: string) => {
  const safeBackground = isHexColor(background) ? background : DEFAULT_FORM_SECONDARY;
  return contrastRatio('#0B1725', safeBackground) >= contrastRatio('#FFFFFF', safeBackground)
    ? '#0B1725'
    : '#FFFFFF';
};

const ensureReadableText = (preferred: string, background: string, minimumContrast = 4.5) =>
  contrastRatio(preferred, background) >= minimumContrast
    ? preferred
    : readableTextColor(background);

export const createAutomaticFormTheme = (
  primary = DEFAULT_FORM_PRIMARY,
  secondary = DEFAULT_FORM_SECONDARY,
  surface = DEFAULT_FORM_SURFACE,
): FormThemeColors => {
  const safePrimary = isHexColor(primary) ? primary.toUpperCase() : DEFAULT_FORM_PRIMARY;
  const safeSecondary = isHexColor(secondary) ? secondary.toUpperCase() : DEFAULT_FORM_SECONDARY;
  const safeSurface = isHexColor(surface) ? surface.toUpperCase() : DEFAULT_FORM_SURFACE;
  const card = mixHexColors('#FFFFFF', safeSurface, 0.9);
  const headerText = readableTextColor(safeSecondary);
  const bodyText = ensureReadableText(safeSecondary, card);
  const inputBackground = mixHexColors('#FFFFFF', safeSurface, 0.96);

  return {
    pageBackground: safeSurface,
    cardBackground: card,
    headerBackground: safeSecondary,
    headerText,
    headerMutedText: ensureReadableText(mixHexColors(headerText, safeSecondary, 0.76), safeSecondary, 3),
    bodyText,
    mutedText: ensureReadableText(mixHexColors(bodyText, card, 0.68), card, 3),
    inputBackground,
    inputBorder: mixHexColors(safePrimary, safeSurface, 0.48),
    inputText: ensureReadableText(safeSecondary, inputBackground),
    primaryButtonBackground: safePrimary,
    primaryButtonText: readableTextColor(safePrimary),
    secondaryButtonBackground: card,
    secondaryButtonText: ensureReadableText(safeSecondary, card),
    progressActive: safePrimary,
    progressInactive: mixHexColors(safeSecondary, safeSurface, 0.18),
    consentBackground: mixHexColors(safeSurface, '#FFFFFF', 0.7),
    successBackground: card,
    successAccent: safePrimary,
    errorBackground: '#FFF1F2',
    errorAccent: '#BE123C',
  };
};

export const normalizeFormThemeColors = (
  value: unknown,
  fallback: FormThemeColors,
): FormThemeColors => {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.entries(fallback).map(([key, defaultValue]) => [
      key,
      isHexColor(candidate[key]) ? candidate[key].toUpperCase() : defaultValue,
    ])
  ) as unknown as FormThemeColors;
};

export const resolveFormTheme = ({
  colorMode,
  primaryColor,
  secondaryColor,
  surfaceColor,
  themeColors,
}: {
  colorMode: FormColorMode;
  primaryColor: string;
  secondaryColor: string;
  surfaceColor: string;
  themeColors: unknown;
}) => {
  const automatic = createAutomaticFormTheme(primaryColor, secondaryColor, surfaceColor);
  return colorMode === 'detailed'
    ? normalizeFormThemeColors(themeColors, automatic)
    : automatic;
};

export const DEFAULT_FORM_THEME_COLORS = createAutomaticFormTheme();
