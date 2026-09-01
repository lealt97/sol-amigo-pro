export const CUSTOM_FORM_CSS_LIMIT = 20_000;

export const CUSTOM_FORM_CSS_EXAMPLE = `.sol-form__card {
  border-radius: 24px;
  box-shadow: 0 18px 45px rgba(14, 35, 55, 0.16);
}

.sol-form__input,
.sol-form__select {
  border-radius: 10px;
  border-color: #64B0F3;
}

.sol-form__button {
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sol-form__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background-color: #FACB5C;
  color: #0E2337;
}`;

const ALLOWED_SELECTORS = new Set([
  '.sol-form', '.sol-form__card', '.sol-form__header', '.sol-form__title',
  '.sol-form__subtitle', '.sol-form__field', '.sol-form__label', '.sol-form__input',
  '.sol-form__select', '.sol-form__button', '.sol-form__secondary-button',
  '.sol-form__progress', '.sol-form__consent', '.sol-form__success', '.sol-form__icon',
  '.sol-form__powered-by',
]);

const ALLOWED_PROPERTIES = new Set([
  'background', 'background-color', 'border', 'border-color', 'border-radius',
  'border-style', 'border-width', 'box-shadow', 'color', 'font-family', 'font-size',
  'font-style', 'font-weight', 'letter-spacing', 'line-height', 'margin', 'margin-bottom',
  'margin-left', 'margin-right', 'margin-top', 'max-width', 'min-height', 'padding',
  'padding-bottom', 'padding-left', 'padding-right', 'padding-top', 'text-align',
  'text-decoration', 'text-transform', 'width',
]);

const ICON_ONLY_PROPERTIES = new Set(['height']);

export const validateCustomFormCss = (css: string): string[] => {
  const errors: string[] = [];
  if (css.length > CUSTOM_FORM_CSS_LIMIT) errors.push('O CSS ultrapassa o limite de 20 KB.');
  if (!css.trim()) return errors;
  if (/\/\*|@|url\s*\(|expression\s*\(|javascript\s*:|\\|<|>/i.test(css)) {
    errors.push('Comentários, regras @, URLs externas e caracteres perigosos não são permitidos.');
  }

  const withoutBlocks = css.replace(/[^{}]+\{[^{}]*\}/g, '');
  if (withoutBlocks.trim()) errors.push('A estrutura do CSS está incompleta ou contém regras aninhadas.');

  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(',').map((item) => item.trim()).filter(Boolean);
    const baseSelectors = selectors.map((selector) => selector.replace(/:(hover|focus|focus-visible)$/i, ''));
    for (const selector of selectors) {
      const baseSelector = selector.replace(/:(hover|focus|focus-visible)$/i, '');
      if (!ALLOWED_SELECTORS.has(baseSelector)) {
        errors.push(`Seletor não permitido: ${selector}`);
      }
    }

    const declarations = match[2].split(';').map((item) => item.trim()).filter(Boolean);
    for (const declaration of declarations) {
      const separator = declaration.indexOf(':');
      if (separator < 1) {
        errors.push(`Declaração inválida: ${declaration}`);
        continue;
      }
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      const iconOnlyPropertyAllowed = ICON_ONLY_PROPERTIES.has(property)
        && baseSelectors.every((selector) => selector === '.sol-form__icon');
      if (!ALLOWED_PROPERTIES.has(property) && !iconOnlyPropertyAllowed) {
        errors.push(`Propriedade não permitida: ${property}`);
      }
      if (property === 'height' && !/^(?:[2-9]\d|1[0-5]\d|160)px$/i.test(value)) {
        errors.push('A altura do ícone deve estar entre 20px e 160px.');
      }
      if (!value || /!important|var\s*\(|calc\s*\(|attr\s*\(|data:|https?:/i.test(value)) {
        errors.push(`Valor não permitido em ${property}.`);
      }
    }
  }

  return [...new Set(errors)].slice(0, 8);
};
