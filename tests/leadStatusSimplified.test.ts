import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAD_STAGE_LABELS,
  LEAD_STATUS_PALETTE,
  normalizeLeadStage,
  getLeadStatusStyle,
} from '../src/utils/leadStatus';

test('Lead status simplificado contém exatamente 5 estágios objetivos', () => {
  const keys = Object.keys(LEAD_STAGE_LABELS);
  assert.equal(keys.length, 5);
  assert.deepEqual(keys, ['novo', 'em_contato', 'proposta_enviada', 'ganho', 'perdido']);
  assert.equal(LEAD_STAGE_LABELS.novo, 'Novo');
  assert.equal(LEAD_STAGE_LABELS.em_contato, 'Em contato');
  assert.equal(LEAD_STAGE_LABELS.proposta_enviada, 'Proposta enviada');
  assert.equal(LEAD_STAGE_LABELS.ganho, 'Ganho');
  assert.equal(LEAD_STAGE_LABELS.perdido, 'Perdido');
});

test('Paleta contém cores consistentes para todos os 5 status', () => {
  const paletteKeys = Object.keys(LEAD_STATUS_PALETTE);
  assert.equal(paletteKeys.length, 5);
  for (const key of ['novo', 'em_contato', 'proposta_enviada', 'ganho', 'perdido'] as const) {
    const item = LEAD_STATUS_PALETTE[key];
    assert.ok(item.label);
    assert.ok(item.darkColor.startsWith('#'));
    assert.ok(item.lightColor.startsWith('#'));
  }
});

test('normalizeLeadStage converte status legados e intermediários sem perda de dados', () => {
  // Novo
  assert.equal(normalizeLeadStage('novo'), 'novo');
  assert.equal(normalizeLeadStage('Novo'), 'novo');
  assert.equal(normalizeLeadStage('Novo lead'), 'novo');

  // Intermediários unificados em "em_contato"
  assert.equal(normalizeLeadStage('em_contato'), 'em_contato');
  assert.equal(normalizeLeadStage('Em contato'), 'em_contato');
  assert.equal(normalizeLeadStage('qualificado'), 'em_contato');
  assert.equal(normalizeLeadStage('Qualificado'), 'em_contato');
  assert.equal(normalizeLeadStage('em_estudo'), 'em_contato');
  assert.equal(normalizeLeadStage('Em estudo'), 'em_contato');
  assert.equal(normalizeLeadStage('atendimento'), 'em_contato');

  // Negociação unificada em "proposta_enviada"
  assert.equal(normalizeLeadStage('proposta_enviada'), 'proposta_enviada');
  assert.equal(normalizeLeadStage('Proposta enviada'), 'proposta_enviada');
  assert.equal(normalizeLeadStage('negociacao'), 'proposta_enviada');
  assert.equal(normalizeLeadStage('Negociação'), 'proposta_enviada');

  // Ganho
  assert.equal(normalizeLeadStage('ganho'), 'ganho');
  assert.equal(normalizeLeadStage('Ganho'), 'ganho');
  assert.equal(normalizeLeadStage('Cliente'), 'ganho');
  assert.equal(normalizeLeadStage('Contrato assinado'), 'ganho');

  // Perdido
  assert.equal(normalizeLeadStage('perdido'), 'perdido');
  assert.equal(normalizeLeadStage('Perdido'), 'perdido');
  assert.equal(normalizeLeadStage('descartado'), 'perdido');

  // Default seguro
  assert.equal(normalizeLeadStage(null), 'novo');
  assert.equal(normalizeLeadStage(undefined), 'novo');
  assert.equal(normalizeLeadStage('qualquer_coisa_estranha'), 'novo');
});

test('getLeadStatusStyle resolve estilo para qualquer status legado ou ativo', () => {
  const styleQualificado = getLeadStatusStyle('qualificado');
  assert.equal(styleQualificado.key, 'em_contato');
  assert.equal(styleQualificado.label, 'Em contato');

  const styleNegociacao = getLeadStatusStyle('negociacao');
  assert.equal(styleNegociacao.key, 'proposta_enviada');
  assert.equal(styleNegociacao.label, 'Proposta enviada');

  const styleNovo = getLeadStatusStyle('novo');
  assert.equal(styleNovo.key, 'novo');
  assert.equal(styleNovo.label, 'Novo');
});
