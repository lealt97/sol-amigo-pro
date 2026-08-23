import React, { useEffect, useMemo, useState } from 'react';
import { Check, Palette, RotateCcw, Save } from 'lucide-react';
import { ThemeConfig } from '../types';
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  applyThemeToDOM,
  getContrastFg,
  saveTheme,
} from '../utils/themeEngine';

interface PersonalizacaoViewProps {
  currentTheme: ThemeConfig;
  onApplyTheme: (newTheme: ThemeConfig) => void;
  onShowToast: (msg: string) => void;
}

type ThemeField = 'primary' | 'secondary' | 'background' | 'accent';

const COLOR_FIELDS: Array<{
  key: ThemeField;
  label: string;
  description: string;
}> = [
  {
    key: 'primary',
    label: 'Cor Primária',
    description: 'Base principal da identidade visual, menu lateral e áreas institucionais.',
  },
  {
    key: 'secondary',
    label: 'Cor Secundária',
    description: 'Ações principais, seleção de menu, botões e elementos interativos.',
  },
  {
    key: 'background',
    label: 'Cor Neutra',
    description: 'Fundo geral da aplicação e base para superfícies e áreas de leitura.',
  },
  {
    key: 'accent',
    label: 'Cor Auxiliar',
    description: 'Indicadores, detalhes visuais, destaques complementares e apoio à marca.',
  },
];

function normalizeHex(value: string, fallback: string) {
  const candidate = value.trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

function sameTheme(a: ThemeConfig, b: ThemeConfig) {
  return (
    a.primary.toUpperCase() === b.primary.toUpperCase() &&
    a.secondary.toUpperCase() === b.secondary.toUpperCase() &&
    a.background.toUpperCase() === b.background.toUpperCase() &&
    a.accent.toUpperCase() === b.accent.toUpperCase()
  );
}

export const PersonalizacaoView: React.FC<PersonalizacaoViewProps> = ({
  currentTheme,
  onApplyTheme,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<ThemeConfig>({ ...currentTheme });

  useEffect(() => {
    setDraft({ ...currentTheme });
  }, [currentTheme]);

  const activePresetId = useMemo(() => {
    return THEME_PRESETS.find((preset) => sameTheme(preset.theme, draft))?.id;
  }, [draft]);

  const applyDraft = (next: ThemeConfig) => {
    setDraft(next);
    applyThemeToDOM(next);
    onApplyTheme(next);
  };

  const handleColorChange = (key: ThemeField, value: string) => {
    const next = { ...draft, [key]: value.toUpperCase() };
    setDraft(next);

    if (/^#[0-9A-F]{6}$/.test(next[key])) {
      applyThemeToDOM(next);
      onApplyTheme(next);
    }
  };

  const handleColorBlur = (key: ThemeField) => {
    const normalized = normalizeHex(draft[key], currentTheme[key]);
    const next = { ...draft, [key]: normalized };
    applyDraft(next);
  };

  const handlePreset = (theme: ThemeConfig) => {
    applyDraft({ ...theme });
  };

  const handleReset = () => {
    applyDraft({ ...DEFAULT_THEME });
    saveTheme(DEFAULT_THEME);
    onShowToast('Paleta padrão Sol Amigo restaurada');
  };

  const handleSave = () => {
    const normalized: ThemeConfig = {
      primary: normalizeHex(draft.primary, DEFAULT_THEME.primary),
      secondary: normalizeHex(draft.secondary, DEFAULT_THEME.secondary),
      background: normalizeHex(draft.background, DEFAULT_THEME.background),
      accent: normalizeHex(draft.accent, DEFAULT_THEME.accent),
    };

    applyDraft(normalized);
    saveTheme(normalized);
    onShowToast('Motor de cores salvo com sucesso');
  };

  const neutralFg = getContrastFg(draft.background);
  const primaryFg = getContrastFg(draft.primary);
  const secondaryFg = getContrastFg(draft.secondary);
  const auxiliaryFg = getContrastFg(draft.accent);

  return (
    <div
      id="personalizacao-page"
      className="max-w-6xl mx-auto space-y-5"
      style={{ color: neutralFg }}
    >
      <section
        className="rounded-xl border p-5"
        style={{
          backgroundColor: draft.background,
          borderColor: `${draft.primary}35`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: `${draft.secondary}18`,
                color: draft.secondary,
              }}
            >
              <Palette className="h-3.5 w-3.5" />
              Motor de Cores
            </div>
            <h2 className="mt-2 text-2xl font-bold">Personalização do Sistema</h2>
            <p className="mt-1 max-w-2xl text-sm opacity-70">
              Configure as quatro cores estruturais da interface ou aplique um tema predefinido.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleReset}
              className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ borderColor: `${draft.primary}35` }}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar padrão
            </button>
            <button
              onClick={handleSave}
              className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: draft.secondary, color: secondaryFg }}
            >
              <Save className="h-4 w-4" />
              Salvar cores
            </button>
          </div>
        </div>
      </section>

      <section
        className="rounded-xl border p-5"
        style={{
          backgroundColor: draft.background,
          borderColor: `${draft.primary}35`,
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">Cores do sistema</h3>
            <p className="text-xs opacity-60">4 variáveis ativas</p>
          </div>
          <div className="flex gap-1.5">
            {[draft.primary, draft.secondary, draft.background, draft.accent].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-7 w-7 rounded-full border shadow-sm"
                style={{ backgroundColor: color, borderColor: `${draft.primary}35` }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {COLOR_FIELDS.map((field) => (
            <div
              key={field.key}
              className="rounded-xl border p-4"
              style={{
                backgroundColor:
                  field.key === 'background' ? draft.background : `${draft.primary}08`,
                borderColor: `${draft.primary}2B`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border shadow-sm"
                      style={{
                        backgroundColor: draft[field.key],
                        borderColor: `${draft.primary}40`,
                      }}
                    />
                    <span className="text-sm font-bold">{field.label}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed opacity-65">
                    {field.description}
                  </p>
                </div>

                <input
                  type="color"
                  value={draft[field.key]}
                  onChange={(e) => handleColorChange(field.key, e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-lg border bg-transparent p-1"
                  style={{ borderColor: `${draft.primary}35` }}
                  aria-label={`Selecionar ${field.label}`}
                />
              </div>

              <input
                type="text"
                value={draft[field.key]}
                maxLength={7}
                onChange={(e) => handleColorChange(field.key, e.target.value)}
                onBlur={() => handleColorBlur(field.key)}
                className="mt-3 h-9 w-full rounded-lg border bg-transparent px-3 font-mono text-xs uppercase outline-none"
                style={{ borderColor: `${draft.primary}35`, color: neutralFg }}
                aria-label={`Código hexadecimal de ${field.label}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border p-5"
        style={{
          backgroundColor: draft.background,
          borderColor: `${draft.primary}35`,
        }}
      >
        <div className="mb-4">
          <h3 className="font-bold">Temas predefinidos</h3>
          <p className="text-xs opacity-60">Clique em um tema para aplicar imediatamente.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {THEME_PRESETS.map((preset) => {
            const selected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePreset(preset.theme)}
                className="relative rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5"
                style={{
                  backgroundColor: preset.theme.background,
                  color: getContrastFg(preset.theme.background),
                  borderColor: selected ? preset.theme.secondary : `${preset.theme.primary}35`,
                  boxShadow: selected ? `0 0 0 2px ${preset.theme.secondary}25` : undefined,
                }}
              >
                {selected && (
                  <span
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: preset.theme.secondary,
                      color: getContrastFg(preset.theme.secondary),
                    }}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                )}

                <div className="mb-3 flex gap-1.5">
                  {[
                    preset.theme.primary,
                    preset.theme.secondary,
                    preset.theme.background,
                    preset.theme.accent,
                  ].map((color, index) => (
                    <span
                      key={`${preset.id}-${index}`}
                      className="h-5 w-5 rounded-full border"
                      style={{ backgroundColor: color, borderColor: `${preset.theme.primary}35` }}
                    />
                  ))}
                </div>
                <div className="pr-5 text-xs font-bold">{preset.name}</div>
                <div className="mt-1 text-[10px] leading-snug opacity-60">
                  {preset.description}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid overflow-hidden rounded-xl border md:grid-cols-[220px_1fr]" style={{ borderColor: `${draft.primary}35` }}>
        <div className="p-4" style={{ backgroundColor: draft.primary, color: primaryFg }}>
          <div className="text-xs font-bold">Sol Amigo Pro</div>
          <div className="mt-5 space-y-2 text-[11px]">
            <div className="rounded-md px-2 py-1.5 opacity-70">Dashboard</div>
            <div
              className="rounded-md px-2 py-1.5 font-semibold"
              style={{ backgroundColor: draft.secondary, color: secondaryFg }}
            >
              Propostas
            </div>
            <div className="rounded-md px-2 py-1.5 opacity-70">Clientes</div>
          </div>
        </div>

        <div className="p-5" style={{ backgroundColor: draft.background, color: neutralFg }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">Pré-visualização</div>
              <div className="text-[11px] opacity-60">Aplicação das quatro cores</div>
            </div>
            <button
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ backgroundColor: draft.secondary, color: secondaryFg }}
            >
              Nova proposta
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3" style={{ borderColor: `${draft.primary}25` }}>
              <div className="text-[10px] opacity-60">Primária</div>
              <div className="mt-1 font-mono text-xs font-bold">{draft.primary}</div>
            </div>
            <div className="rounded-lg border p-3" style={{ borderColor: `${draft.primary}25` }}>
              <div className="text-[10px] opacity-60">Secundária</div>
              <div className="mt-1 font-mono text-xs font-bold">{draft.secondary}</div>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: draft.accent, color: auxiliaryFg }}
            >
              <div className="text-[10px] opacity-70">Auxiliar</div>
              <div className="mt-1 font-mono text-xs font-bold">{draft.accent}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
