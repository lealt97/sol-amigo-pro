import React, { useState, useEffect, useRef } from 'react';
import {
  FileCode2,
  Image as ImageIcon,
  Type,
  Check,
  RotateCcw,
  Save,
  Upload,
  Eye,
  Sparkles,
  Sun,
  Layers,
  FileCheck,
} from 'lucide-react';
import { PdfSettingsConfig, ThemeConfig } from '../types';
import { DEFAULT_PDF_SETTINGS } from '../utils/themeEngine';

interface PdfCustomizacoesViewProps {
  currentPdfSettings: PdfSettingsConfig;
  currentTheme: ThemeConfig;
  onSavePdfSettings: (newSettings: PdfSettingsConfig) => void;
  onShowToast: (msg: string) => void;
}

export const PdfCustomizacoesView: React.FC<PdfCustomizacoesViewProps> = ({
  currentPdfSettings,
  currentTheme,
  onSavePdfSettings,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<PdfSettingsConfig>({
    ...currentPdfSettings,
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft({ ...currentPdfSettings });
  }, [currentPdfSettings]);

  const handleToggle = (key: keyof PdfSettingsConfig) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDraft((prev) => ({
          ...prev,
          customLogoUrl: event.target?.result as string,
        }));
        onShowToast('Logo carregado com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDraft((prev) => ({
          ...prev,
          customCoverUrl: event.target?.result as string,
        }));
        onShowToast('Foto de capa carregada!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    localStorage.setItem('solamigo.pdf', JSON.stringify(draft));
    onSavePdfSettings(draft);
    onShowToast('Customizações do PDF salvas com sucesso!');
  };

  const handleReset = () => {
    setDraft({ ...DEFAULT_PDF_SETTINGS });
    localStorage.removeItem('solamigo.pdf');
    onSavePdfSettings({ ...DEFAULT_PDF_SETTINGS });
    onShowToast('Configurações padrão do PDF restauradas');
  };

  const effectivePrimary = draft.useAccountColors
    ? currentTheme.primary
    : draft.primary;
  const effectiveSecondary = draft.useAccountColors
    ? currentTheme.secondary
    : draft.secondary;

  return (
    <div id="pdf-customizacoes-page" className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <section className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              <FileCode2 className="w-3.5 h-3.5" />
              Configurações / PDF & Propostas
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Customizações do PDF
            </h2>
            <p className="text-slate-500 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Defina o visual padrão das propostas comerciais entregues aos clientes: template, capa, marca, cores, tipografia e quais seções técnicas devem constar no documento final.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="pdf-reset-btn"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar Padrão
            </button>
            <button
              id="pdf-save-btn"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:brightness-105 active:scale-95"
              style={{
                backgroundColor: currentTheme.secondary,
                boxShadow: `0 4px 14px ${currentTheme.secondary}40`,
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Customizações
            </button>
          </div>
        </div>
      </section>

      {/* Main Grid: Controls vs Paper Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Template */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Layers className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Template da Proposta Comercial
                </h3>
                <p className="text-xs text-slate-400">
                  Escolha o modelo de capa e a estrutura gráfica das páginas
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Modelo Gráfico Ativo
              </label>
              <select
                id="pdf-template-select"
                value={draft.template}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, template: e.target.value }))
                }
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const name = `Modelo ${String(i + 1).padStart(2, '0')}`;
                  return (
                    <option key={name} value={name}>
                      {name} - {i === 0 ? 'Clássico Executivo (Padrão)' : i === 1 ? 'Moderno Minimalista' : i === 2 ? 'Engenharia & Agro' : `Layout Premium ${i + 1}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </section>

          {/* Section 2: Marca & Capa */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Marca, Logo e Foto de Capa
                </h3>
                <p className="text-xs text-slate-400">
                  Imagens que aparecem na capa e no cabeçalho das páginas
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {/* Show logo toggle */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Exibir logo da empresa
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Mostra a identidade visual no cabeçalho e na capa da proposta.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showLogo')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    draft.showLogo ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                      draft.showLogo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show cover photo toggle */}
              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Exibir foto de capa
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Permite usar uma imagem principal de painéis solares na primeira página.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('showCoverPhoto')}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    draft.showCoverPhoto ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                      draft.showCoverPhoto ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Upload Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-slate-400" />
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">
                    Logo da Proposta
                  </span>
                  <span className="text-[10px] text-slate-400">
                    PNG transparente recomendado
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  {draft.customLogoUrl ? 'Alterar Logo' : 'Escolher Arquivo'}
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
                <ImageIcon className="w-5 h-5 text-slate-400" />
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block">
                    Foto de Capa do PDF
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Banner 16:9 ou instalação solar
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  {draft.customCoverUrl ? 'Alterar Capa' : 'Escolher Imagem'}
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Cores e Tipografia */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Type className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Cores do Documento e Tipografia
                </h3>
                <p className="text-xs text-slate-400">
                  Harmonização visual das fontes e paletas no arquivo PDF
                </p>
              </div>
            </div>

            {/* Sync colors toggle */}
            <div className="py-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  Usar cores da conta automaticamente
                </span>
                <span className="text-[11px] text-slate-500">
                  Mantém o PDF sempre sincronizado com o tema do SaaS Sol Amigo.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('useAccountColors')}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  draft.useAccountColors ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                    draft.useAccountColors ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {!draft.useAccountColors && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Cor Primária PDF
                  </span>
                  <input
                    type="color"
                    value={draft.primary}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        primary: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300 bg-white"
                  />
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Cor Secundária PDF
                  </span>
                  <input
                    type="color"
                    value={draft.secondary}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        secondary: e.target.value.toUpperCase(),
                      }))
                    }
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Font selector */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-bold text-slate-700">
                Família Tipográfica
              </label>
              <select
                value={draft.font}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    font: e.target.value as PdfSettingsConfig['font'],
                  }))
                }
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="Inter">Inter (Moderna e Legível)</option>
                <option value="Manrope">Manrope (Geométrica e Técnica)</option>
                <option value="Montserrat">Montserrat (Display Executivo)</option>
                <option value="Lato">Lato (Harmoniosa e Clássica)</option>
              </select>
            </div>
          </section>

          {/* Section 4: Seções do PDF */}
          <section className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Seções de Conteúdo Técnico no PDF
                </h3>
                <p className="text-xs text-slate-400">
                  Marque as páginas que devem ser geradas na exportação
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  key: 'showFinancial' as const,
                  title: 'Análise Financeira & Payback',
                  desc: 'Exibe tabela de fluxo de caixa, economia acumulada em 25 anos e retorno do investimento.',
                },
                {
                  key: 'showEquipment' as const,
                  title: 'Equipamentos do Sistema FV',
                  desc: 'Ficha técnica dos módulos fotovoltaicos, inversores, proteções e garantias de fábrica.',
                },
                {
                  key: 'showEnvironmental' as const,
                  title: 'Dados e Impacto Ambiental',
                  desc: 'Toneladas de CO2 evitadas e equivalência em árvores preservadas ao longo da vida útil.',
                },
                {
                  key: 'showFooter' as const,
                  title: 'Rodapé com Contatos Comerciais',
                  desc: 'Exibe WhatsApp, e-mail, registro de engenharia (CREA/CFT) e dados da empresa.',
                },
              ].map((item) => (
                <div key={item.key} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      {item.title}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.desc}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(item.key)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      draft[item.key] ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                        draft[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Live Interactive A4 Paper Preview */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Pré-visualização do PDF
                </h3>
                <p className="text-[11px] text-slate-400">
                  {draft.template} · Proporção A4 Oficial
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                {draft.font}
              </span>
            </div>

            {/* A4 Paper Container */}
            <div
              id="a4-paper-preview"
              className="relative w-full max-w-[320px] mx-auto aspect-[210/297] bg-white border border-slate-200 rounded-sm shadow-xl overflow-hidden p-6 flex flex-col justify-between select-none"
              style={{
                fontFamily: `${draft.font}, sans-serif`,
              }}
            >
              {/* Left accent color bar */}
              <div
                className="absolute top-0 bottom-0 left-0 w-2.5"
                style={{ backgroundColor: effectivePrimary }}
              />

              {/* Header / Logo */}
              <div>
                {draft.showLogo && (
                  <div className="flex items-center justify-between mb-4">
                    {draft.customLogoUrl ? (
                      <img
                        src={draft.customLogoUrl}
                        alt="Logo"
                        className="h-7 object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Sun
                          className="w-4 h-4"
                          style={{ color: effectiveSecondary }}
                        />
                        <span
                          className="font-black text-xs tracking-wider"
                          style={{ color: effectivePrimary }}
                        >
                          SOL AMIGO
                        </span>
                      </div>
                    )}
                    <span className="text-[7px] text-slate-400 font-mono font-bold uppercase">
                      Proposta Comercial
                    </span>
                  </div>
                )}

                {/* Cover Image or Graphic */}
                {draft.showCoverPhoto && (
                  <div
                    className="h-24 -mx-6 my-2 relative overflow-hidden flex items-end p-3 text-white"
                    style={{
                      background: draft.customCoverUrl
                        ? `url(${draft.customCoverUrl}) center/cover`
                        : `linear-gradient(135deg, ${effectivePrimary}, ${effectiveSecondary})`,
                    }}
                  >
                    <div className="relative z-10">
                      <span className="text-[7.5px] uppercase font-bold tracking-widest opacity-80 block">
                        Energia Solar Fotovoltaica
                      </span>
                      <span className="text-[10px] font-extrabold block">
                        Solução Sustentável & Alta Rentabilidade
                      </span>
                    </div>
                    {/* Decorative solar grid overlay */}
                    <div className="absolute inset-0 bg-black/15 pointer-events-none" />
                  </div>
                )}

                {/* Title & Client */}
                <div className="mt-3 space-y-1">
                  <h4
                    className="text-lg font-black leading-tight"
                    style={{ color: effectivePrimary }}
                  >
                    PROPOSTA DE
                    <br />
                    ENERGIA SOLAR
                  </h4>
                  <div className="text-[9px] text-slate-600 font-semibold pt-1 border-t border-slate-100">
                    Cliente: <b className="text-slate-900">Fazenda Santa Rita</b>
                  </div>
                  <div className="text-[8px] text-slate-400">
                    Potência: 28.08 kWp · Economia anual: R$ 34.200
                  </div>
                </div>

                {/* Simulated Content Bars */}
                <div className="mt-4 space-y-1.5">
                  <div className="h-1.5 bg-slate-100 rounded w-11/12" />
                  <div className="h-1.5 bg-slate-100 rounded w-4/5" />
                  <div className="h-1.5 bg-slate-100 rounded w-5/6" />
                </div>

                {/* Included Sections Badges */}
                <div className="mt-4 flex flex-wrap gap-1">
                  {draft.showFinancial && (
                    <span className="text-[6.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                      ✓ Financeiro & Payback
                    </span>
                  )}
                  {draft.showEquipment && (
                    <span className="text-[6.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      ✓ Ficha Módulos e Inversor
                    </span>
                  )}
                  {draft.showEnvironmental && (
                    <span className="text-[6.5px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                      ✓ Impacto Ambiental CO2
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              {draft.showFooter && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[7px] text-slate-400">
                  <span>solamigo.com.br · (19) 98822-4411</span>
                  <span>Eng. Responsável · CREA/CFT</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
