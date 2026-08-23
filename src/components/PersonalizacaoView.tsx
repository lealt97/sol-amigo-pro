import React, { useState, useEffect } from 'react';
import {
  Palette,
  RotateCcw,
  Eye,
  Save,
  CheckCircle2,
  Sparkles,
  Layers,
  Layout,
  Sliders,
} from 'lucide-react';
import { ThemeConfig } from '../types';
import { DEFAULT_THEME, getContrastFg, applyThemeToDOM } from '../utils/themeEngine';

interface PersonalizacaoViewProps {
  currentTheme: ThemeConfig;
  onSaveTheme: (newTheme: ThemeConfig) => void;
  onShowToast: (msg: string) => void;
}

export const PersonalizacaoView: React.FC<PersonalizacaoViewProps> = ({
  currentTheme,
  onSaveTheme,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<ThemeConfig>({ ...currentTheme });

  useEffect(() => {
    setDraft({ ...currentTheme });
  }, [currentTheme]);

  const handleColorChange = (key: keyof ThemeConfig, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value.toUpperCase() }));
  };

  const handleApplyPreview = () => {
    applyThemeToDOM(draft);
    onShowToast('Tema aplicado em tempo real para visualização');
  };

  const handleResetDefault = () => {
    setDraft({ ...DEFAULT_THEME });
    applyThemeToDOM(DEFAULT_THEME);
    localStorage.removeItem('solamigo.theme');
    onSaveTheme({ ...DEFAULT_THEME });
    onShowToast('Paleta padrão do Sol Amigo restaurada');
  };

  const handleSave = () => {
    localStorage.setItem('solamigo.theme', JSON.stringify(draft));
    applyThemeToDOM(draft);
    onSaveTheme(draft);
    onShowToast('Identidade visual da conta salva com sucesso!');
  };

  const colorFields: Array<{
    key: keyof ThemeConfig;
    label: string;
    description: string;
  }> = [
    {
      key: 'primary',
      label: 'Cor Primária (Menu e Topo)',
      description:
        'Aplica-se ao fundo do menu lateral, cabeçalhos dos relatórios e elementos de destaque da marca.',
    },
    {
      key: 'secondary',
      label: 'Cor Secundária (Botões e Ações)',
      description:
        'Aplica-se ao item ativo do menu lateral, botões de ação principal, badges e links importantes.',
    },
    {
      key: 'accent',
      label: 'Cor de Destaque (Gráficos e Payback)',
      description:
        'Aplica-se a elementos de sucesso, métricas de economia solar, gradientes e indicadores visuais.',
    },
    {
      key: 'background',
      label: 'Cor de Fundo da Aplicação',
      description:
        'Fundo geral das páginas, cards de métricas e painéis do dashboard operacional.',
    },
  ];

  return (
    <div id="personalizacao-page" className="space-y-4 max-w-7xl mx-auto text-[#C9D1D9]">
      {/* Header section */}
      <section className="bg-[#161B22] p-4 md:p-5 rounded-lg border border-[#30363D]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#21262D] text-blue-400 border border-[#30363D] text-[10px] font-mono uppercase tracking-wider mb-2">
              <Palette className="w-3 h-3" />
              SETTINGS / THEME_ENGINE
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Personalização da Conta & Cores
            </h2>
            <p className="text-[#8B949E] text-xs mt-1 max-w-2xl leading-relaxed">
              Defina a paleta de cores exclusiva da sua empresa integradora fotovoltaica. O motor de cores
              recalcula o contraste tipográfico e atualiza o menu, botões, gráficos e documentos em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="reset-theme-btn"
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-[#C9D1D9] hover:text-white font-mono text-xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
            <button
              id="preview-theme-btn"
              onClick={handleApplyPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#30363D] bg-[#21262D] hover:bg-[#30363D] text-white font-mono text-xs transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Pré-visualizar
            </button>
            <button
              id="save-theme-btn"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2EA043] text-white font-mono text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Controls vs Live Interactive Preview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Controls Column */}
        <section className="lg:col-span-7 bg-[#161B22] p-4 md:p-5 rounded-lg border border-[#30363D] space-y-4">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white text-xs">
                Paleta de Cores do Sistema
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8B949E]">
              4 variáveis ativas
            </span>
          </div>

          <div className="space-y-3">
            {colorFields.map((field) => (
              <div
                key={field.key}
                className="p-3 rounded-lg border border-[#30363D] bg-[#1C2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-black/40 shadow-xs shrink-0"
                      style={{ backgroundColor: draft[field.key] }}
                    />
                    <span className="font-semibold text-white text-xs">
                      {field.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8B949E] leading-relaxed max-w-md">
                    {field.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <input
                    type="color"
                    id={`color-input-${field.key}`}
                    value={draft[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="w-9 h-8 rounded cursor-pointer border border-[#30363D] p-0.5 bg-[#21262D]"
                  />
                  <input
                    type="text"
                    id={`color-text-${field.key}`}
                    value={draft[field.key]}
                    maxLength={7}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    className="w-20 h-8 px-2 rounded border border-[#30363D] bg-[#21262D] font-mono text-xs text-white uppercase text-center outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick preset chips */}
          <div className="pt-3 border-t border-[#30363D]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B949E] mb-2 block">
              Paletas Recomendadas:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const p = {
                    primary: '#161B22',
                    secondary: '#238636',
                    accent: '#58A6FF',
                    background: '#0D1117',
                  };
                  setDraft(p);
                  applyThemeToDOM(p);
                }}
                className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#161B22] border border-slate-500" />
                <span className="w-2 h-2 rounded-full bg-[#238636]" />
                High Density (Padrão)
              </button>

              <button
                onClick={() => {
                  const p = {
                    primary: '#183956',
                    secondary: '#0076DD',
                    accent: '#B4BF8A',
                    background: '#F6F8FB',
                  };
                  setDraft(p);
                  applyThemeToDOM(p);
                }}
                className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#183956]" />
                <span className="w-2 h-2 rounded-full bg-[#0076DD]" />
                Sol Amigo Light
              </button>

              <button
                onClick={() => {
                  const p = {
                    primary: '#0B2545',
                    secondary: '#134074',
                    accent: '#E0A96D',
                    background: '#0F172A',
                  };
                  setDraft(p);
                  applyThemeToDOM(p);
                }}
                className="px-2.5 py-1 rounded bg-[#21262D] hover:bg-[#30363D] border border-[#30363D] text-[#C9D1D9] hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-[#0B2545]" />
                <span className="w-2 h-2 rounded-full bg-[#E0A96D]" />
                Solar Gold Dark
              </button>
            </div>
          </div>
        </section>

        {/* Live Preview Card (Right Column) */}
        <section className="lg:col-span-5 bg-[#161B22] p-4 rounded-lg border border-[#30363D] space-y-3 sticky top-20">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363D]">
            <div>
              <h3 className="font-semibold text-white text-xs flex items-center gap-1.5">
                <Layout className="w-3.5 h-3.5 text-blue-400" />
                Pré-Visualização em Tempo Real
              </h3>
              <p className="text-[10px] text-[#8B949E]">
                Simulação da interface do SaaS fotovoltaico
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#21262D] text-emerald-400 font-mono text-[9px] border border-[#30363D]">
              Live Sync
            </span>
          </div>

          {/* Simulated CRM Shell */}
          <div
            id="theme-preview-box"
            className="rounded-lg border border-[#30363D] overflow-hidden shadow-inner transition-all"
            style={{ backgroundColor: draft.background }}
          >
            <div className="grid grid-cols-12 min-h-[340px]">
              {/* Simulated Sidebar */}
              <div
                className="col-span-4 p-2.5 flex flex-col justify-between transition-colors border-r border-[#30363D]"
                style={{
                  backgroundColor: draft.primary,
                  color: getContrastFg(draft.primary),
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-white/10">
                    <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center font-bold text-[9px]">
                      ☀
                    </div>
                    <span className="font-bold text-[11px] tracking-tight">
                      Sol Amigo Pro
                    </span>
                  </div>

                  <div className="space-y-1 text-[10px] font-medium">
                    <div className="px-1.5 py-0.5 rounded opacity-70 hover:opacity-100">
                      Dashboard
                    </div>
                    <div className="px-1.5 py-0.5 rounded opacity-70 hover:opacity-100">
                      Clientes
                    </div>
                    <div
                      className="px-1.5 py-0.5 rounded font-bold shadow-xs transition-all"
                      style={{
                        backgroundColor: draft.secondary,
                        color: getContrastFg(draft.secondary),
                      }}
                    >
                      Propostas
                    </div>
                    <div className="px-1.5 py-0.5 rounded opacity-70 hover:opacity-100">
                      Financeiro
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-[8px] font-mono opacity-60">
                  v2.4.1 PRODUCTION
                </div>
              </div>

              {/* Simulated Main Dashboard Area */}
              <div className="col-span-8 p-2.5 space-y-2.5">
                <div className="h-6 bg-[#1C2128] rounded border border-[#30363D] flex items-center justify-between px-2">
                  <div className="w-12 h-1.5 bg-[#30363D] rounded" />
                  <div
                    className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold"
                    style={{
                      backgroundColor: `${draft.secondary}30`,
                      color: draft.secondary,
                    }}
                  >
                    RL
                  </div>
                </div>

                <div className="p-2 bg-[#1C2128] rounded border border-[#30363D] space-y-0.5">
                  <span className="text-[9px] text-[#8B949E] font-medium block">
                    Propostas no mês
                  </span>
                  <div className="text-base font-mono font-bold text-white">46 un</div>
                  <span
                    className="text-[8px] font-mono flex items-center gap-1"
                    style={{ color: draft.accent }}
                  >
                    ↑ 18% vs mês anterior
                  </span>
                </div>

                <div
                  className="h-12 rounded p-2 flex flex-col justify-end text-white border border-[#30363D]"
                  style={{
                    background: `linear-gradient(135deg, ${draft.secondary}, ${draft.accent})`,
                  }}
                >
                  <span className="text-[8px] uppercase tracking-wider font-bold opacity-90">
                    Potência FV Total
                  </span>
                  <span className="text-xs font-mono font-bold">2.4 Megawatts</span>
                </div>

                <button
                  className="w-full py-1.5 rounded font-mono font-bold text-[10px] transition-all flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: draft.secondary,
                    color: getContrastFg(draft.secondary),
                  }}
                >
                  <Sparkles className="w-3 h-3" />
                  Nova Proposta FV
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#1C2128] p-2.5 rounded border border-[#30363D] text-[10px] font-mono space-y-1 text-[#8B949E]">
            <div className="flex items-center justify-between">
              <span>Contraste Primário:</span>
              <span className="text-white font-bold">
                {getContrastFg(draft.primary) === '#FFFFFF'
                  ? 'Light Fg (AA PASS)'
                  : 'Dark Fg (AA PASS)'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Contraste Botões:</span>
              <span className="text-white font-bold">
                {getContrastFg(draft.secondary) === '#FFFFFF'
                  ? 'Light Fg (AA PASS)'
                  : 'Dark Fg (AA PASS)'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
