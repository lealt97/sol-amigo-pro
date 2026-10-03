import type { CoverLogoSlot } from '../utils/pdfCoverEditor';

export interface PdfCoverTemplate {
  id: string;
  name: string;
  file: string;
  logoSlot: CoverLogoSlot;
  logoPlaceholder: CoverLogoSlot;
}

export const PDF_COVER_TEMPLATES: PdfCoverTemplate[] = [
  {
    id: 'a4-01',
    name: 'Capa 01',
    file: 'proposal-covers/a4-01.svg',
    logoSlot: { x: 18, y: 18, width: 132, height: 50, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 16, width: 156, height: 88, background: '#FFFFFF' },
  },
  {
    id: 'a4-02',
    name: 'Capa 02',
    file: 'proposal-covers/a4-02.svg',
    logoSlot: { x: 430, y: 18, width: 145, height: 54, background: '#D9D9D9' },
    logoPlaceholder: { x: 410, y: 14, width: 175, height: 84, background: '#D9D9D9' },
  },
  {
    id: 'a4-03',
    name: 'Capa 03',
    file: 'proposal-covers/a4-03.svg',
    logoSlot: { x: 22, y: 18, width: 135, height: 52, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 14, width: 165, height: 90, background: '#FFFFFF' },
  },
  {
    id: 'a4-04',
    name: 'Capa 04',
    file: 'proposal-covers/a4-04.svg',
    logoSlot: { x: 80, y: 20, width: 155, height: 54, background: '#D9D9D9' },
    logoPlaceholder: { x: 18, y: 14, width: 190, height: 82, background: '#D9D9D9' },
  },
  {
    id: 'a4-05',
    name: 'Capa 05',
    file: 'proposal-covers/a4-05.svg',
    logoSlot: { x: 18, y: 58, width: 155, height: 54, background: '#D9D9D9' },
    logoPlaceholder: { x: 12, y: 18, width: 180, height: 104, background: '#D9D9D9' },
  },
  {
    id: 'a4-06',
    name: 'Capa 06',
    file: 'proposal-covers/a4-06.svg',
    logoSlot: { x: 20, y: 22, width: 150, height: 54, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 14, width: 180, height: 88, background: '#FFFFFF' },
  },
  {
    id: 'a4-07',
    name: 'Capa 07',
    file: 'proposal-covers/a4-07.svg',
    logoSlot: { x: 18, y: 28, width: 135, height: 48, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 16, width: 165, height: 92, background: '#FFFFFF' },
  },
  {
    id: 'a4-08',
    name: 'Capa 08',
    file: 'proposal-covers/a4-08.svg',
    logoSlot: { x: 18, y: 24, width: 155, height: 52, background: '#D9D9D9' },
    logoPlaceholder: { x: 10, y: 14, width: 180, height: 92, background: '#D9D9D9' },
  },
  {
    id: 'a4-09',
    name: 'Capa 09',
    file: 'proposal-covers/a4-09.svg',
    logoSlot: { x: 190, y: 40, width: 215, height: 52, background: '#FFFFFF' },
    logoPlaceholder: { x: 150, y: 16, width: 295, height: 95, background: '#FFFFFF' },
  },
  {
    id: 'a4-10',
    name: 'Capa 10',
    file: 'proposal-covers/a4-10.svg',
    logoSlot: { x: 22, y: 40, width: 165, height: 52, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 16, width: 195, height: 92, background: '#FFFFFF' },
  },
  {
    id: 'a4-11',
    name: 'Capa 11',
    file: 'proposal-covers/a4-11.svg',
    logoSlot: { x: 22, y: 18, width: 165, height: 52, background: '#FFFFFF' },
    logoPlaceholder: { x: 12, y: 14, width: 195, height: 88, background: '#FFFFFF' },
  },
  {
    id: 'a4-12',
    name: 'Capa 12',
    file: 'proposal-covers/a4-12.svg',
    logoSlot: { x: 28, y: 48, width: 165, height: 54, background: '#D4D5D7' },
    logoPlaceholder: { x: 16, y: 18, width: 205, height: 100, background: '#D4D5D7' },
  },
];

export const getPdfCoverTemplate = (id: string) =>
  PDF_COVER_TEMPLATES.find((template) => template.id === id) ?? PDF_COVER_TEMPLATES[0];

export const getPdfCoverAssetUrl = (file: string) => {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${file}`;
};
