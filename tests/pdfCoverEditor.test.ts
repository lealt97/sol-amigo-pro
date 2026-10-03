import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  extractCoverColors,
  getSafePhotoScale,
  isLockedCoverColor,
  normalizeSvgColor,
  stripLogoPlaceholderMarkup,
} from '../src/utils/pdfCoverEditor';

test('normaliza cores SVG nomeadas e hexadecimais', () => {
  assert.equal(normalizeSvgColor('white'), '#FFFFFF');
  assert.equal(normalizeSvgColor('black'), '#000000');
  assert.equal(normalizeSvgColor('#0af'), '#00AAFF');
  assert.equal(normalizeSvgColor('#0051f0'), '#0051F0');
  assert.equal(normalizeSvgColor('none'), null);
});

test('branco e cinzas ficam bloqueados, preto e cores permanecem editáveis', () => {
  assert.equal(isLockedCoverColor('#FFFFFF'), true);
  assert.equal(isLockedCoverColor('#D9D9D9'), true);
  assert.equal(isLockedCoverColor('#524848'), true);
  assert.equal(isLockedCoverColor('#000000'), false);
  assert.equal(isLockedCoverColor('#0051F0'), false);
  assert.equal(isLockedCoverColor('#39B66A'), false);
});

test('extrai cores únicas da capa sem confundir preenchimentos por URL', () => {
  const svg = '<svg><path fill="#0051F0"/><path fill="white"/><path stroke="#0051f0"/><path fill="url(#pattern0)"/><path fill="#D9D9D9"/></svg>';
  const colors = extractCoverColors(svg);
  assert.deepEqual(colors.map((item) => item.normalized), ['#0051F0', '#FFFFFF', '#D9D9D9']);
  assert.deepEqual(colors.map((item) => item.locked), [false, true, true]);
});

test('rotação aumenta a escala segura sem alterar a proporção da imagem', () => {
  const bounds = { x: 0, y: 0, width: 400, height: 300 };
  assert.equal(getSafePhotoScale(bounds, 0, 1), 1);
  assert.ok(getSafePhotoScale(bounds, 45, 1) > 1);
  assert.equal(getSafePhotoScale(bounds, 0, 2), 2);
});


test('remove o placeholder marcado sem desenhar retângulo por cima', () => {
  const svg = '<svg><path data-solamigo-logo-placeholder="true" d="M0 0L10 10" fill="#000"/><path d="M20 20L30 30" fill="#123456"/></svg>';
  const result = stripLogoPlaceholderMarkup(svg);

  assert.equal(result.includes('data-solamigo-logo-placeholder'), false);
  assert.equal(result.includes('M0 0L10 10'), false);
  assert.equal(result.includes('M20 20L30 30'), true);
});

test('todas as 12 capas possuem placeholder de logo explicitamente marcado', () => {
  const expectedMarkerCounts = [1, 1, 1, 11, 1, 1, 1, 1, 1, 1, 1, 1];

  expectedMarkerCounts.forEach((expected, index) => {
    const id = String(index + 1).padStart(2, '0');
    const svg = readFileSync(`public/proposal-covers/a4-${id}.svg`, 'utf8');
    const count = (svg.match(/data-solamigo-logo-placeholder="true"/g) || []).length;
    assert.equal(count, expected, `a4-${id} deve marcar exatamente o placeholder do logo`);
  });
});
