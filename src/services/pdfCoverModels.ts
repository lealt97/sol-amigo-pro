import { accountStorage, workspace, saveWorkspace } from '../platform/workspace/workspace';
import type { PdfCoverModel } from '../types';
import {
  clonePdfSettingsForModel,
  createPdfCoverModel,
  duplicatePdfCoverModel,
  renamePdfCoverModel,
  updatePdfCoverModelSettings,
} from '../utils/pdfCoverModels';

export {
  createPdfCoverModel,
  duplicatePdfCoverModel,
  renamePdfCoverModel,
  updatePdfCoverModelSettings,
};

const STORAGE_PREFIX = 'solamigo.pdf-cover-models.v1';

const getStorageKey = async (): Promise<string> => {
  const owner = workspace.getStatus().owner;
  if (!owner) throw new Error('Entre na conta para carregar os modelos de capa.');
  return `${STORAGE_PREFIX}.${owner}`;
};

export const fetchPdfCoverModels = async (): Promise<PdfCoverModel[]> => {
  const key = await getStorageKey();
  try {
    const raw = accountStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object' && item.id && item.sourceTemplateId && item.settings)
      .map((item) => ({
        ...item,
        name: String(item.name || 'Modelo personalizado'),
        settings: clonePdfSettingsForModel(item.settings),
      }));
  } catch {
    return [];
  }
};

export const savePdfCoverModels = async (models: PdfCoverModel[]): Promise<void> => {
  const key = await getStorageKey();
  accountStorage.setItem(key, JSON.stringify(models));
  await saveWorkspace();
};
