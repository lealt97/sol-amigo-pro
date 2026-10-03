import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Image as ImageIcon,
  Loader2,
  MoreVertical,
  Move,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { PdfCoverModel, PdfElementTransform, PdfSettingsConfig, ThemeConfig } from '../types';
import {
  getPdfCoverAssetUrl,
  getPdfCoverTemplate,
  PDF_COVER_TEMPLATES,
} from '../data/pdfCoverTemplates';
import {
  buildCoverSvg,
  extractCoverColors,
  extractCoverPhotoBounds,
  getPhotoPanLimits,
  normalizeSvgColor,
  normalizeTransform,
} from '../utils/pdfCoverEditor';
import { savePdfSettings } from '../utils/themeEngine';
import {
  fetchProfileBrandLogos,
  ProfileBrandLogo,
} from '../services/websiteFormIntegration';
import { uploadPdfCoverPhoto } from '../services/pdfCustomization';
import {
  createPdfCoverModel,
  duplicatePdfCoverModel,
  fetchPdfCoverModels,
  savePdfCoverModels,
  updatePdfCoverModelSettings,
} from '../services/pdfCoverModels';

interface PdfCustomizacoesViewProps {
  currentPdfSettings: PdfSettingsConfig;
  currentTheme: ThemeConfig;
  onSavePdfSettings: (newSettings: PdfSettingsConfig) => void;
  onShowToast: (msg: string) => void;
}

type EditorTab = 'templates' | 'colors' | 'logo' | 'photo';
type EditableLayer = 'logo' | 'photo';

const cloneSettings = (settings: PdfSettingsConfig): PdfSettingsConfig => ({
  ...settings,
  coverColors: { ...(settings.coverColors ?? {}) },
  coverLogoTransform: { ...normalizeTransform(settings.coverLogoTransform, 'logo') },
  coverPhotoTransform: { ...normalizeTransform(settings.coverPhotoTransform, 'photo') },
});

const createPristineTemplateSettings = (
  base: PdfSettingsConfig,
  templateId: string
): PdfSettingsConfig => ({
  ...cloneSettings(base),
  template: templateId,
  coverColors: {},
  customLogoUrl: undefined,
  customCoverUrl: undefined,
  showLogo: true,
  showCoverPhoto: true,
  coverLogoTransform: { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
  coverPhotoTransform: { offsetX: 0, offsetY: 0, scale: 1.15, rotation: 0 },
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatRotation = (value: number) => `${Math.round(value)}°`;
const formatScale = (value: number) => `${Math.round(value * 100)}%`;

export const PdfCustomizacoesView: React.FC<PdfCustomizacoesViewProps> = ({
  currentPdfSettings,
  currentTheme,
  onSavePdfSettings,
  onShowToast,
}) => {
  const [draft, setDraft] = useState<PdfSettingsConfig>(() => cloneSettings(currentPdfSettings));
  const [activeTab, setActiveTab] = useState<EditorTab>('templates');
  const [activeLayer, setActiveLayer] = useState<EditableLayer | null>(null);
  const [rawSvg, setRawSvg] = useState('');
  const [svgLoading, setSvgLoading] = useState(true);
  const [logos, setLogos] = useState<ProfileBrandLogo[]>([]);
  const [logosLoading, setLogosLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState<PdfCoverModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [modelMenuId, setModelMenuId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const originalsSliderRef = useRef<HTMLDivElement>(null);
  const modelsSliderRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    layer: EditableLayer;
    pointerId: number;
    startX: number;
    startY: number;
    transform: PdfElementTransform;
  } | null>(null);

  const template = useMemo(() => getPdfCoverTemplate(draft.template), [draft.template]);

  useEffect(() => {
    setDraft(cloneSettings(currentPdfSettings));
  }, [currentPdfSettings]);

  useEffect(() => {
    let mounted = true;
    setSvgLoading(true);
    setError('');

    fetch(getPdfCoverAssetUrl(template.file))
      .then((response) => {
        if (!response.ok) throw new Error('Não foi possível carregar a capa selecionada.');
        return response.text();
      })
      .then((content) => {
        if (mounted) setRawSvg(content);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar a capa.');
      })
      .finally(() => {
        if (mounted) setSvgLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [template.file]);

  useEffect(() => {
    let mounted = true;
    setModelsLoading(true);
    fetchPdfCoverModels()
      .then((items) => {
        if (mounted) setModels(items);
      })
      .catch(() => {
        if (mounted) setModels([]);
      })
      .finally(() => {
        if (mounted) setModelsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLogosLoading(true);
    fetchProfileBrandLogos()
      .then((items) => {
        if (mounted) setLogos(items);
      })
      .catch(() => {
        if (mounted) setLogos([]);
      })
      .finally(() => {
        if (mounted) setLogosLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const colorTokens = useMemo(
    () => extractCoverColors(rawSvg).filter((token) => !token.locked),
    [rawSvg]
  );
  const lockedColorCount = useMemo(
    () => extractCoverColors(rawSvg).filter((token) => token.locked).length,
    [rawSvg]
  );
  const photoBounds = useMemo(() => extractCoverPhotoBounds(rawSvg), [rawSvg]);

  const previewSvg = useMemo(() => {
    if (!rawSvg) return '';
    return buildCoverSvg(rawSvg, {
      colorOverrides: draft.coverColors,
      photoUrl: draft.showCoverPhoto ? draft.customCoverUrl : undefined,
      photoTransform: draft.coverPhotoTransform,
      logoUrl: draft.showLogo ? draft.customLogoUrl : undefined,
      logoTransform: draft.coverLogoTransform,
      logoSlot: template.logoSlot,
      logoPlaceholder: template.logoPlaceholder,
    });
  }, [
    rawSvg,
    draft.coverColors,
    draft.customCoverUrl,
    draft.customLogoUrl,
    draft.coverLogoTransform,
    draft.coverPhotoTransform,
    draft.showCoverPhoto,
    draft.showLogo,
    template.logoSlot,
    template.logoPlaceholder,
  ]);

  const setTransform = (layer: EditableLayer, patch: Partial<PdfElementTransform>) => {
    setDraft((current) => {
      const key = layer === 'logo' ? 'coverLogoTransform' : 'coverPhotoTransform';
      const previous = normalizeTransform(current[key], layer);
      const next = normalizeTransform({ ...previous, ...patch }, layer);
      return { ...current, [key]: next };
    });
  };

  const resetTransform = (layer: EditableLayer) => {
    setTransform(layer, {
      offsetX: 0,
      offsetY: 0,
      scale: layer === 'photo' ? 1.15 : 1,
      rotation: 0,
    });
  };

  const scrollSlider = (ref: React.RefObject<HTMLDivElement | null>, direction: -1 | 1) => {
    ref.current?.scrollBy({ left: direction * 420, behavior: 'smooth' });
  };

  const persistModels = async (next: PdfCoverModel[]) => {
    setModels(next);
    try {
      await savePdfCoverModels(next);
    } catch {
      setError('Não foi possível salvar sua biblioteca de modelos.');
    }
  };

  const addTemplateAsModel = async (templateId: string) => {
    const source = getPdfCoverTemplate(templateId);
    const sameSourceCount = models.filter((model) => model.sourceTemplateId === templateId).length;
    const name = sameSourceCount
      ? `${source.name} personalizada ${sameSourceCount + 1}`
      : `${source.name} personalizada`;
    const model = createPdfCoverModel(
      templateId,
      createPristineTemplateSettings(currentPdfSettings, templateId),
      name
    );
    const next = [...models, model];
    await persistModels(next);
    setModelMenuId(null);
    setActiveTab('templates');
    setActiveLayer(null);
    onShowToast(`Modelo "${model.name}" adicionado em Meus Modelos.`);
    requestAnimationFrame(() => {
      modelsSliderRef.current?.scrollTo({
        left: modelsSliderRef.current.scrollWidth,
        behavior: 'smooth',
      });
    });
  };

  const editModel = (model: PdfCoverModel) => {
    setActiveModelId(model.id);
    setDraft(cloneSettings(model.settings));
    setActiveLayer(null);
    setActiveTab('colors');
    setModelMenuId(null);
  };

  const duplicateModel = async (model: PdfCoverModel) => {
    const copy = duplicatePdfCoverModel(model, models.map((item) => item.name));
    const next = [...models, copy];
    await persistModels(next);
    setModelMenuId(null);
    onShowToast(`"${copy.name}" criado como cópia independente.`);
  };

  const deleteModel = async (model: PdfCoverModel) => {
    if (!window.confirm(`Excluir o modelo "${model.name}"? Essa ação não altera a capa original.`)) return;
    const next = models.filter((item) => item.id !== model.id);
    await persistModels(next);
    setModelMenuId(null);

    if (activeModelId === model.id) {
      setActiveModelId(null);
      setDraft(createPristineTemplateSettings(currentPdfSettings, model.sourceTemplateId));
      setActiveLayer(null);
      setActiveTab('templates');
    }

    onShowToast('Modelo excluído.');
  };

  const setColorOverride = (source: string, value: string) => {
    setDraft((current) => ({
      ...current,
      coverColors: {
        ...(current.coverColors ?? {}),
        [source]: value.toUpperCase(),
      },
    }));
  };

  const resetColors = () => {
    setDraft((current) => ({ ...current, coverColors: {} }));
  };

  const selectLogo = (url: string) => {
    setDraft((current) => ({
      ...current,
      customLogoUrl: url,
      showLogo: true,
      coverLogoTransform: current.customLogoUrl === url
        ? current.coverLogoTransform
        : { offsetX: 0, offsetY: 0, scale: 1, rotation: 0 },
    }));
    setActiveLayer('logo');
    setActiveTab('logo');
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    setError('');
    try {
      const url = await uploadPdfCoverPhoto(file);
      setDraft((current) => ({
        ...current,
        customCoverUrl: url,
        showCoverPhoto: true,
        coverPhotoTransform: { offsetX: 0, offsetY: 0, scale: 1.15, rotation: 0 },
      }));
      setActiveLayer('photo');
      setActiveTab('photo');
      onShowToast('Imagem da capa enviada.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activeLayer) return;
    if (activeLayer === 'logo' && (!draft.showLogo || !draft.customLogoUrl)) return;
    if (activeLayer === 'photo' && (!draft.showCoverPhoto || !draft.customCoverUrl)) return;

    const transform = normalizeTransform(
      activeLayer === 'logo' ? draft.coverLogoTransform : draft.coverPhotoTransform,
      activeLayer
    );

    dragRef.current = {
      layer: activeLayer,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      transform,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = previewRef.current;
    if (!drag || !stage || drag.pointerId !== event.pointerId) return;

    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaX = ((event.clientX - drag.startX) / rect.width) * 595;
    const deltaY = ((event.clientY - drag.startY) / rect.height) * 842;
    let offsetX = drag.transform.offsetX + deltaX;
    let offsetY = drag.transform.offsetY + deltaY;

    if (drag.layer === 'photo' && photoBounds) {
      const limits = getPhotoPanLimits(photoBounds, drag.transform);
      offsetX = clamp(offsetX, -limits.x, limits.x);
      offsetY = clamp(offsetY, -limits.y, limits.y);
    } else if (drag.layer === 'logo') {
      const slot = template.logoSlot;
      offsetX = clamp(offsetX, -slot.x - slot.width * 0.6, 595 - slot.x - slot.width * 0.4);
      offsetY = clamp(offsetY, -slot.y - slot.height * 0.6, 842 - slot.y - slot.height * 0.4);
    }

    setTransform(drag.layer, { offsetX, offsetY });
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer capture may already be released by the browser
    }
    dragRef.current = null;
  };

  const handleSave = async () => {
    const normalized = cloneSettings(draft);

    if (activeModelId) {
      const currentModel = models.find((model) => model.id === activeModelId);
      if (currentModel) {
        const updated = updatePdfCoverModelSettings(currentModel, normalized);
        await persistModels(models.map((model) => model.id === updated.id ? updated : model));
      }
    }

    savePdfSettings(normalized);
    onSavePdfSettings(normalized);
    onShowToast(activeModelId ? 'Modelo atualizado e aplicado.' : 'Personalização da capa salva.');
  };

  const restoreSaved = () => {
    if (activeModelId) {
      const currentModel = models.find((model) => model.id === activeModelId);
      if (currentModel) {
        setDraft(cloneSettings(currentModel.settings));
        setActiveLayer(null);
        onShowToast('Alterações do modelo descartadas.');
        return;
      }
    }

    setDraft(cloneSettings(currentPdfSettings));
    setActiveLayer(null);
    onShowToast('Alterações não salvas descartadas.');
  };

  const tabs: Array<{ id: EditorTab; label: string; icon: React.ElementType }> = [
    { id: 'templates', label: 'Capas', icon: ImageIcon },
    { id: 'colors', label: 'Cores', icon: Palette },
    { id: 'logo', label: 'Logo', icon: Move },
    { id: 'photo', label: 'Foto', icon: UploadCloud },
  ];

  const logoTransform = normalizeTransform(draft.coverLogoTransform, 'logo');
  const photoTransform = normalizeTransform(draft.coverPhotoTransform, 'photo');

  return (
    <div id="pdf-customizacoes-page" className="mx-auto max-w-[1600px] space-y-5">
      <section
        className="rounded-2xl border p-5 shadow-sm"
        style={{ backgroundColor: currentTheme.primary, borderColor: currentTheme.border }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] opacity-65">
              <ImageIcon className="h-4 w-4" />
              Editor de propostas
            </div>
            <h1 className="mt-1 text-2xl font-black">Personalização da capa PDF</h1>
            <p className="mt-1 max-w-3xl text-sm opacity-65">
              As 12 capas originais ficam protegidas. Adicione uma delas em Meus Modelos para editar cores, logo e foto sem alterar o arquivo de origem.
            </p>
          </div>

          {activeModelId && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={restoreSaved}
                className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold"
                style={{ borderColor: currentTheme.border }}
              >
                <RotateCcw className="h-4 w-4" />
                Descartar
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-4 text-xs font-black"
                style={{ backgroundColor: currentTheme.secondary, color: '#fff' }}
              >
                <Save className="h-4 w-4" />
                Salvar modelo
              </button>
            </div>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside
          className="min-w-0 rounded-2xl border"
          style={{ backgroundColor: currentTheme.primary, borderColor: currentTheme.border }}
        >
          <div className="grid grid-cols-4 gap-1 border-b p-2" style={{ borderColor: currentTheme.border }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={tab.id !== 'templates' && !activeModelId}
                  onClick={() => {
                    if (tab.id !== 'templates' && !activeModelId) return;
                    setActiveTab(tab.id);
                    if (tab.id === 'logo') setActiveLayer('logo');
                    else if (tab.id === 'photo') setActiveLayer('photo');
                    else setActiveLayer(null);
                  }}
                  className="flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-35"
                  style={selected
                    ? { backgroundColor: currentTheme.secondary, color: '#fff' }
                    : { color: currentTheme.text }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="max-h-[calc(100vh-230px)] min-h-[560px] overflow-y-auto p-4">
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black">Capas disponíveis</h2>
                      <p className="mt-1 text-xs opacity-55">Modelos originais protegidos. Adicione uma cópia para personalizar.</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => scrollSlider(originalsSliderRef, -1)}
                        className="rounded-lg border p-2"
                        style={{ borderColor: currentTheme.border }}
                        aria-label="Capas anteriores"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSlider(originalsSliderRef, 1)}
                        className="rounded-lg border p-2"
                        style={{ borderColor: currentTheme.border }}
                        aria-label="Próximas capas"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div
                    ref={originalsSliderRef}
                    className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {PDF_COVER_TEMPLATES.map((item, index) => (
                      <article
                        key={item.id}
                        className="w-[158px] shrink-0 snap-start rounded-xl border p-2"
                        style={{ borderColor: currentTheme.border }}
                      >
                        <div className="aspect-[595/842] overflow-hidden rounded-lg bg-white">
                          <img
                            src={getPdfCoverAssetUrl(item.file)}
                            alt={item.name}
                            className="h-full w-full object-contain"
                            draggable={false}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-bold">{item.name}</span>
                          <span className="text-[9px] opacity-45">{String(index + 1).padStart(2, '0')}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => void addTemplateAsModel(item.id)}
                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[10px] font-black"
                          style={{ backgroundColor: currentTheme.secondary, color: '#fff' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar modelo
                        </button>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="border-t pt-5" style={{ borderColor: currentTheme.border }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-black">Meus Modelos</h2>
                      <p className="mt-1 text-xs opacity-55">Cada modelo e cada duplicação possuem edição totalmente independente.</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => scrollSlider(modelsSliderRef, -1)}
                        className="rounded-lg border p-2"
                        style={{ borderColor: currentTheme.border }}
                        aria-label="Modelos anteriores"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollSlider(modelsSliderRef, 1)}
                        className="rounded-lg border p-2"
                        style={{ borderColor: currentTheme.border }}
                        aria-label="Próximos modelos"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {modelsLoading ? (
                    <div className="flex min-h-44 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin opacity-60" />
                    </div>
                  ) : models.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-5 text-center" style={{ borderColor: currentTheme.border }}>
                      <ImageIcon className="mx-auto h-7 w-7 opacity-35" />
                      <div className="mt-2 text-xs font-bold">Nenhum modelo adicionado</div>
                      <p className="mt-1 text-[10px] opacity-50">
                        Use “Adicionar modelo” em uma das capas acima para criar sua primeira versão editável.
                      </p>
                    </div>
                  ) : (
                    <div
                      ref={modelsSliderRef}
                      className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      {models.map((model) => {
                        const selected = activeModelId === model.id;
                        const source = getPdfCoverTemplate(model.sourceTemplateId);
                        const menuOpen = modelMenuId === model.id;
                        return (
                          <article
                            key={model.id}
                            className="w-[168px] shrink-0 snap-start rounded-xl border p-2"
                            style={{
                              borderColor: selected ? currentTheme.secondary : currentTheme.border,
                              boxShadow: selected ? `0 0 0 2px ${currentTheme.secondary}25` : undefined,
                            }}
                          >
                            <div className="relative block w-full">
                              <div className="aspect-[595/842] overflow-hidden rounded-lg bg-white">
                                <ModelThumbnail model={model} />
                              </div>
                              {selected && (
                                <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex min-w-0 items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[11px] font-bold" title={model.name}>{model.name}</div>
                                <div className="mt-0.5 truncate text-[9px] opacity-45">Base: {source.name}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setModelMenuId(menuOpen ? null : model.id)}
                                className="shrink-0 rounded-md border p-1.5"
                                style={{ borderColor: currentTheme.border }}
                                aria-label={`Opções de ${model.name}`}
                                aria-expanded={menuOpen}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {menuOpen && (
                              <div
                                className="mt-2 overflow-hidden rounded-lg border"
                                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.background }}
                              >
                                <button
                                  type="button"
                                  onClick={() => editModel(model)}
                                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[10px] font-bold hover:opacity-80"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void duplicateModel(model)}
                                  className="flex w-full items-center gap-2 border-t px-2.5 py-2 text-left text-[10px] font-bold hover:opacity-80"
                                  style={{ borderColor: currentTheme.border }}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                  Duplicar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void deleteModel(model)}
                                  className="flex w-full items-center gap-2 border-t px-2.5 py-2 text-left text-[10px] font-bold text-red-400 hover:opacity-80"
                                  style={{ borderColor: currentTheme.border }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === 'colors' && (
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black">Motor de cores</h2>
                    <p className="mt-1 text-xs leading-relaxed opacity-55">
                      Cada cor editável do SVG possui seu próprio controle. Branco e cinza permanecem protegidos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetColors}
                    className="shrink-0 rounded-lg border p-2"
                    style={{ borderColor: currentTheme.border }}
                    title="Restaurar cores da capa"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                {svgLoading ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin opacity-60" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {colorTokens.map((token, index) => {
                      const current = normalizeSvgColor(draft.coverColors?.[token.source] || token.source) || token.source;
                      return (
                        <div
                          key={token.source}
                          className="rounded-xl border p-3"
                          style={{ borderColor: currentTheme.border }}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={current}
                              onChange={(event) => setColorOverride(token.source, event.target.value)}
                              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
                              style={{ borderColor: currentTheme.border }}
                              aria-label={`Editar cor ${index + 1}`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-black uppercase tracking-wider opacity-50">
                                Cor {index + 1}
                              </div>
                              <input
                                value={draft.coverColors?.[token.source] || token.source}
                                maxLength={7}
                                onChange={(event) => setColorOverride(token.source, event.target.value)}
                                onBlur={(event) => {
                                  const normalized = normalizeSvgColor(event.target.value) || token.source;
                                  setColorOverride(token.source, normalized);
                                }}
                                className="mt-1 h-8 w-full rounded-lg border bg-transparent px-2 font-mono text-xs uppercase outline-none"
                                style={{ borderColor: currentTheme.border }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDraft((currentDraft) => {
                                  const next = { ...(currentDraft.coverColors ?? {}) };
                                  delete next[token.source];
                                  return { ...currentDraft, coverColors: next };
                                });
                              }}
                              className="rounded-lg border p-2 opacity-65 hover:opacity-100"
                              style={{ borderColor: currentTheme.border }}
                              title="Restaurar esta cor"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 text-[9px] opacity-45">Original: {token.source}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 rounded-xl border p-3 text-[10px] leading-relaxed opacity-60" style={{ borderColor: currentTheme.border }}>
                  {lockedColorCount} cor(es) branca(s) ou cinza(s) foram bloqueadas e não podem ser alteradas.
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-sm font-black">Logo da empresa</h2>
                  <p className="mt-1 text-xs leading-relaxed opacity-55">
                    Use uma das logos já enviadas em Perfil. Selecione e arraste diretamente na capa.
                  </p>
                </div>

                {logosLoading ? (
                  <div className="flex min-h-32 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin opacity-60" />
                  </div>
                ) : logos.length ? (
                  <div className="grid grid-cols-2 gap-2">
                    {logos.map((logo) => {
                      const selected = draft.customLogoUrl === logo.url && draft.showLogo;
                      return (
                        <button
                          key={logo.id}
                          type="button"
                          onClick={() => selectLogo(logo.url)}
                          className="relative flex min-h-24 items-center justify-center overflow-hidden rounded-xl border p-3"
                          style={{
                            borderColor: selected ? currentTheme.secondary : currentTheme.border,
                            backgroundColor: logo.background === 'dark' ? '#0E2337' : '#FFFFFF',
                          }}
                        >
                          <img src={logo.url} alt={logo.label} className="max-h-16 max-w-full object-contain" />
                          {selected && (
                            <span className="absolute right-2 top-2 rounded-full bg-emerald-500 p-1 text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border p-4 text-xs opacity-65" style={{ borderColor: currentTheme.border }}>
                    Nenhuma logo cadastrada. Envie suas logos na área Perfil e elas aparecerão aqui automaticamente.
                  </div>
                )}

                {draft.customLogoUrl && (
                  <div className="mt-5 space-y-4 border-t pt-4" style={{ borderColor: currentTheme.border }}>
                    <TransformControls
                      label="Tamanho"
                      value={logoTransform.scale}
                      min={0.2}
                      max={4}
                      step={0.05}
                      formatted={formatScale(logoTransform.scale)}
                      onChange={(scale) => setTransform('logo', { scale })}
                      theme={currentTheme}
                    />
                    <TransformControls
                      label="Rotação"
                      value={logoTransform.rotation}
                      min={-180}
                      max={180}
                      step={1}
                      formatted={formatRotation(logoTransform.rotation)}
                      onChange={(rotation) => setTransform('logo', { rotation })}
                      theme={currentTheme}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => resetTransform('logo')}
                        className="rounded-lg border px-3 py-2 text-xs font-bold"
                        style={{ borderColor: currentTheme.border }}
                      >
                        Resetar posição
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, showLogo: !current.showLogo }))}
                        className="rounded-lg border px-3 py-2 text-xs font-bold"
                        style={{ borderColor: currentTheme.border }}
                      >
                        {draft.showLogo ? 'Ocultar logo' : 'Mostrar logo'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'photo' && (
              <div>
                <div className="mb-4">
                  <h2 className="text-sm font-black">Imagem da máscara</h2>
                  <p className="mt-1 text-xs leading-relaxed opacity-55">
                    A foto mantém sempre a proporção original. O editor usa corte proporcional e nunca estica a imagem.
                  </p>
                </div>

                <label
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-black"
                  style={{ borderColor: currentTheme.border }}
                >
                  {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploadingPhoto ? 'Enviando imagem...' : draft.customCoverUrl ? 'Trocar imagem' : 'Enviar imagem'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    disabled={uploadingPhoto}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void handlePhotoUpload(file);
                    }}
                  />
                </label>

                {draft.customCoverUrl && (
                  <>
                    <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: currentTheme.border }}>
                      <img src={draft.customCoverUrl} alt="Imagem da capa" className="h-36 w-full object-cover" />
                    </div>

                    <div className="mt-5 space-y-4">
                      <TransformControls
                        label="Zoom"
                        value={photoTransform.scale}
                        min={1}
                        max={4}
                        step={0.05}
                        formatted={formatScale(photoTransform.scale)}
                        onChange={(scale) => setTransform('photo', { scale })}
                        theme={currentTheme}
                      />
                      <TransformControls
                        label="Rotação"
                        value={photoTransform.rotation}
                        min={-180}
                        max={180}
                        step={1}
                        formatted={formatRotation(photoTransform.rotation)}
                        onChange={(rotation) => setTransform('photo', { rotation })}
                        theme={currentTheme}
                      />

                      <div className="rounded-xl border p-3 text-[10px] leading-relaxed opacity-65" style={{ borderColor: currentTheme.border }}>
                        Para garantir que não exista distorção, largura e altura nunca são redimensionadas separadamente. Ao girar a foto, o sistema aumenta automaticamente a escala mínima necessária para manter a máscara coberta.
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => resetTransform('photo')}
                          className="rounded-lg border px-3 py-2 text-xs font-bold"
                          style={{ borderColor: currentTheme.border }}
                        >
                          Resetar enquadramento
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, showCoverPhoto: !current.showCoverPhoto }))}
                          className="rounded-lg border px-3 py-2 text-xs font-bold"
                          style={{ borderColor: currentTheme.border }}
                        >
                          {draft.showCoverPhoto ? 'Ocultar foto' : 'Mostrar foto'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {activeModelId ? (
            <div
              className="sticky top-4 rounded-2xl border p-4 md:p-5"
              style={{ backgroundColor: currentTheme.primary, borderColor: currentTheme.border }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black">
                    {models.find((model) => model.id === activeModelId)?.name || template.name}
                  </div>
                  <div className="mt-0.5 text-[10px] opacity-50">
                    Meu Modelo · base {template.name} · A4 · 595 × 842 · SVG vetorial
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(draft.customLogoUrl || draft.customCoverUrl) && (
                    <div className="inline-flex rounded-xl border p-1" style={{ borderColor: currentTheme.border }}>
                      {draft.customLogoUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('logo');
                            setActiveLayer('logo');
                          }}
                          className="rounded-lg px-3 py-1.5 text-[10px] font-bold"
                          style={activeLayer === 'logo'
                            ? { backgroundColor: currentTheme.secondary, color: '#fff' }
                            : undefined}
                        >
                          Mover logo
                        </button>
                      )}
                      {draft.customCoverUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('photo');
                            setActiveLayer('photo');
                          }}
                          className="rounded-lg px-3 py-1.5 text-[10px] font-bold"
                          style={activeLayer === 'photo'
                            ? { backgroundColor: currentTheme.secondary, color: '#fff' }
                            : undefined}
                        >
                          Mover foto
                        </button>
                      )}
                    </div>
                  )}

                  <span className="rounded-full border px-3 py-1.5 text-[10px] font-bold" style={{ borderColor: currentTheme.border }}>
                    {activeLayer ? `Arrastando: ${activeLayer === 'logo' ? 'logo' : 'foto'}` : 'Editando modelo'}
                  </span>
                </div>
              </div>

              <div className="flex min-h-[620px] items-start justify-center overflow-auto rounded-xl border p-3 md:p-6" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.background }}>
                <div
                  ref={previewRef}
                  onPointerDown={beginDrag}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className={`relative aspect-[595/842] w-full max-w-[595px] select-none overflow-hidden bg-white shadow-2xl ${
                    activeLayer ? 'cursor-move' : 'cursor-default'
                  }`}
                  style={{ touchAction: activeLayer ? 'none' : 'auto' }}
                  title={activeLayer ? 'Clique e arraste para reposicionar o elemento selecionado' : undefined}
                >
                  {svgLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white text-slate-600">
                      <Loader2 className="h-7 w-7 animate-spin" />
                    </div>
                  ) : previewSvg ? (
                    <div
                      className="absolute inset-0 h-full w-full"
                      dangerouslySetInnerHTML={{ __html: previewSvg }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-white text-sm font-bold text-slate-500">
                      Capa indisponível
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] opacity-55">
                <span>
                  A foto usa <strong>preserveAspectRatio</strong> e escala uniforme: nunca há esticamento horizontal ou vertical.
                </span>
                <span>Alterações só ficam permanentes após salvar o modelo.</span>
              </div>
            </div>
          ) : (
            <div
              className="sticky top-4 flex min-h-[680px] items-center justify-center rounded-2xl border p-6"
              style={{ backgroundColor: currentTheme.primary, borderColor: currentTheme.border }}
            >
              <div className="max-w-md text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${currentTheme.secondary}22`, color: currentTheme.secondary }}
                >
                  <Pencil className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-black">Nenhum modelo em edição</h2>
                <p className="mt-2 text-sm leading-relaxed opacity-60">
                  As capas originais agora servem apenas como base. Clique em <strong>Adicionar modelo</strong> e depois,
                  em <strong>Meus Modelos</strong>, abra o menu de três pontos e escolha <strong>Editar</strong>.
                </p>
                <div className="mt-5 rounded-xl border p-4 text-left text-xs leading-relaxed opacity-65" style={{ borderColor: currentTheme.border }}>
                  Assim, o modelo original nunca é alterado e cada cópia permanece independente das demais.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const ModelThumbnail: React.FC<{ model: PdfCoverModel }> = ({ model }) => {
  const [svg, setSvg] = useState('');
  const template = getPdfCoverTemplate(model.sourceTemplateId);

  useEffect(() => {
    let mounted = true;
    fetch(getPdfCoverAssetUrl(template.file))
      .then((response) => response.ok ? response.text() : Promise.reject())
      .then((content) => {
        if (mounted) setSvg(content);
      })
      .catch(() => {
        if (mounted) setSvg('');
      });

    return () => {
      mounted = false;
    };
  }, [template.file]);

  const rendered = useMemo(() => {
    if (!svg) return '';
    return buildCoverSvg(svg, {
      colorOverrides: model.settings.coverColors,
      photoUrl: model.settings.showCoverPhoto ? model.settings.customCoverUrl : undefined,
      photoTransform: model.settings.coverPhotoTransform,
      logoUrl: model.settings.showLogo ? model.settings.customLogoUrl : undefined,
      logoTransform: model.settings.coverLogoTransform,
      logoSlot: template.logoSlot,
      logoPlaceholder: template.logoPlaceholder,
    });
  }, [
    svg,
    model.settings.coverColors,
    model.settings.customCoverUrl,
    model.settings.customLogoUrl,
    model.settings.coverLogoTransform,
    model.settings.coverPhotoTransform,
    model.settings.showCoverPhoto,
    model.settings.showLogo,
    template.logoSlot,
    template.logoPlaceholder,
  ]);

  if (!rendered) {
    return (
      <img
        src={getPdfCoverAssetUrl(template.file)}
        alt={model.name}
        className="h-full w-full object-contain"
        draggable={false}
      />
    );
  }

  return (
    <div
      className="h-full w-full"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

interface TransformControlsProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatted: string;
  onChange: (value: number) => void;
  theme: ThemeConfig;
}

const TransformControls: React.FC<TransformControlsProps> = ({
  label,
  value,
  min,
  max,
  step,
  formatted,
  onChange,
  theme,
}) => (
  <label className="block">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="text-xs font-bold">{label}</span>
      <span className="font-mono text-[10px] opacity-55">{formatted}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-[var(--secondary)]"
      style={{ accentColor: theme.secondary }}
    />
  </label>
);
