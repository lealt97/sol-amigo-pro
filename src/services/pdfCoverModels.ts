import type { PdfCoverModel, PdfSettingsConfig } from '../types';
import { supabase } from '../lib/supabase';
import { normalizeTransform } from '../utils/pdfCoverEditor';

const STORAGE_PREFIX = 'solamigo.pdf-cover-models.v1';

const cloneSettings = (settings: PdfSettingsConfig): PdfSettingsConfig => ({
  ...settings,
  coverColors: { ...(settings.coverColors ?? {}) },
  coverLogoTransform: { ...normalizeTransform(settings.coverLogoTransform, 'logo') },
  coverPhotoTransform: { ...normalizeTransform(settings.coverPhotoTransform, 'photo') },
});

const getStorageKey = async (): Promise<string> => {
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return `${STORAGE_PREFIX}.${data.user.id}`;
  } catch {
    // Fallback local: mantém a biblioteca utilizável mesmo se a sessão ainda estiver sincronizando.
  }
  return `${STORAGE_PREFIX}.local`;
};

export const createPdfCoverModel = (
  sourceTemplateId: string,
  settings: PdfSettingsConfig,
  name?: string
): PdfCoverModel => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name?.trim() || 'Novo modelo',
    sourceTemplateId,
    settings: cloneSettings({ ...settings, template: sourceTemplateId }),
    createdAt: now,
    updatedAt: now,
  };
};

export const duplicatePdfCoverModel = (
  source: PdfCoverModel,
  existingNames: string[] = []
): PdfCoverModel => {
  const baseName = source.name.replace(/\s+\(cópia(?: \d+)?\)$/i, '').trim() || 'Modelo';
  let candidate = `${baseName} (cópia)`;
  let suffix = 2;
  const used = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase('pt-BR')));

  while (used.has(candidate.toLocaleLowerCase('pt-BR'))) {
    candidate = `${baseName} (cópia ${suffix})`;
    suffix += 1;
  }

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: candidate,
    sourceTemplateId: source.sourceTemplateId,
    settings: cloneSettings(source.settings),
    createdAt: now,
    updatedAt: now,
  };
};

export const updatePdfCoverModelSettings = (
  model: PdfCoverModel,
  settings: PdfSettingsConfig
): PdfCoverModel => ({
  ...model,
  sourceTemplateId: model.sourceTemplateId,
  settings: cloneSettings({ ...settings, template: model.sourceTemplateId }),
  updatedAt: new Date().toISOString(),
});

export const fetchPdfCoverModels = async (): Promise<PdfCoverModel[]> => {
  const key = await getStorageKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object' && item.id && item.sourceTemplateId && item.settings)
      .map((item) => ({
        ...item,
        name: String(item.name || 'Modelo personalizado'),
        settings: cloneSettings(item.settings),
      }));
  } catch {
    return [];
  }
};

export const savePdfCoverModels = async (models: PdfCoverModel[]): Promise<void> => {
  const key = await getStorageKey();
  localStorage.setItem(key, JSON.stringify(models));
};
