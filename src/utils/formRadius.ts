export const DEFAULT_FORM_BORDER_RADIUS = 12;
export const MIN_FORM_BORDER_RADIUS = 0;
export const MAX_FORM_BORDER_RADIUS = 24;

export const normalizeFormBorderRadius = (
  value: unknown,
  fallback = DEFAULT_FORM_BORDER_RADIUS
) => {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const safeFallback = Number.isFinite(fallback)
    ? Math.min(MAX_FORM_BORDER_RADIUS, Math.max(MIN_FORM_BORDER_RADIUS, fallback))
    : DEFAULT_FORM_BORDER_RADIUS;

  if (!Number.isFinite(numericValue)) return Math.round(safeFallback);
  return Math.round(Math.min(MAX_FORM_BORDER_RADIUS, Math.max(MIN_FORM_BORDER_RADIUS, numericValue)));
};

export const createFormBorderRadiusTokens = (value: unknown) => {
  const base = normalizeFormBorderRadius(value);

  return {
    base,
    control: base,
    compact: Math.min(18, Math.round(base * 0.75)),
    panel: Math.min(28, Math.round(base * 1.35)),
    card: Math.min(32, Math.round(base * 2)),
  };
};
