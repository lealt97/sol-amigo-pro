import assert from 'node:assert/strict';
import test from 'node:test';
import type { PdfSettingsConfig } from '../src/types';
import {
  createPdfCoverModel,
  duplicatePdfCoverModel,
  updatePdfCoverModelSettings,
} from '../src/utils/pdfCoverModels';

const baseSettings: PdfSettingsConfig = {
  template: 'a4-01',
  useAccountColors: true,
  primary: '#183956',
  secondary: '#0076DD',
  font: 'Inter',
  showLogo: true,
  showCoverPhoto: true,
  showFinancial: true,
  showEquipment: true,
  showEnvironmental: true,
  showFooter: true,
  customLogoUrl: 'https://example.com/logo.png',
  coverColors: { '#0076DD': '#00AA00' },
  coverLogoTransform: { offsetX: 10, offsetY: 5, scale: 1.2, rotation: 4 },
  coverPhotoTransform: { offsetX: 20, offsetY: -10, scale: 1.4, rotation: 8 },
};

test('modelo adicionado recebe cópia independente das configurações', () => {
  const model = createPdfCoverModel('a4-01', baseSettings, 'Modelo teste');

  model.settings.coverColors!['#0076DD'] = '#FF0000';
  model.settings.coverLogoTransform!.scale = 2;

  assert.equal(baseSettings.coverColors!['#0076DD'], '#00AA00');
  assert.equal(baseSettings.coverLogoTransform!.scale, 1.2);
});

test('duplicação não compartilha estado editável com o modelo de origem', () => {
  const original = createPdfCoverModel('a4-01', baseSettings, 'Modelo original');
  const duplicate = duplicatePdfCoverModel(original, [original.name]);

  duplicate.settings.coverColors!['#0076DD'] = '#123456';
  duplicate.settings.coverPhotoTransform!.rotation = 90;

  assert.notEqual(duplicate.id, original.id);
  assert.equal(original.settings.coverColors!['#0076DD'], '#00AA00');
  assert.equal(original.settings.coverPhotoTransform!.rotation, 8);
  assert.match(duplicate.name, /cópia/i);
});

test('editar um modelo mantém a referência do template original sem alterar outras cópias', () => {
  const original = createPdfCoverModel('a4-02', { ...baseSettings, template: 'a4-02' }, 'A');
  const sibling = duplicatePdfCoverModel(original, [original.name]);
  const changedSettings = {
    ...original.settings,
    template: 'a4-12',
    coverColors: { '#0076DD': '#FACB5C' },
  };

  const updated = updatePdfCoverModelSettings(original, changedSettings);

  assert.equal(updated.sourceTemplateId, 'a4-02');
  assert.equal(updated.settings.template, 'a4-02');
  assert.equal(updated.settings.coverColors!['#0076DD'], '#FACB5C');
  assert.equal(sibling.settings.coverColors!['#0076DD'], '#00AA00');
});
