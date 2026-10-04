import type { PdfCoverModel, PdfSettingsConfig } from '../types';
import { cloneEditorialSettings } from './pdfEditorial';
import { normalizeTransform } from './pdfCoverEditor';

export const clonePdfSettingsForModel = (settings: PdfSettingsConfig): PdfSettingsConfig => ({
  ...settings,
  editorial: cloneEditorialSettings(settings.editorial),
  coverColors: { ...(settings.coverColors ?? {}) },
  coverLogoTransform: { ...normalizeTransform(settings.coverLogoTransform, 'logo') },
  coverPhotoTransform: { ...normalizeTransform(settings.coverPhotoTransform, 'photo') },
});

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
    settings: clonePdfSettingsForModel({ ...settings, template: sourceTemplateId }),
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
    settings: clonePdfSettingsForModel(source.settings),
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
  settings: clonePdfSettingsForModel({ ...settings, template: model.sourceTemplateId }),
  updatedAt: new Date().toISOString(),
});
