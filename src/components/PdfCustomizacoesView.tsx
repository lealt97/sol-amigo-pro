import React from 'react';
import { PdfSettingsConfig, ThemeConfig } from '../types';

interface PdfCustomizacoesViewProps {
  currentPdfSettings: PdfSettingsConfig;
  currentTheme: ThemeConfig;
  onSavePdfSettings: (newSettings: PdfSettingsConfig) => void;
  onShowToast: (msg: string) => void;
}

export const PdfCustomizacoesView: React.FC<PdfCustomizacoesViewProps> = () => {
  return null;
};
