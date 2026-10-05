import type { PdfCoverModel } from '../types';
import { supabase } from '../lib/supabase';
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
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) return `${STORAGE_PREFIX}.${data.user.id}`;
  } catch {
    // Fallback local: mantém a biblioteca utilizável mesmo se a sessão ainda estiver sincronizando.
  }
  return `${STORAGE_PREFIX}.local`;
};

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
        settings: clonePdfSettingsForModel(item.settings),
      }));
  } catch {
    return [];
  }
};

export const savePdfCoverModels = async (models: PdfCoverModel[]): Promise<void> => {
  const key = await getStorageKey();
  localStorage.setItem(key, JSON.stringify(models));
};
