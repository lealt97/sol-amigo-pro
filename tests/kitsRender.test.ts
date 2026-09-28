import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { KitsView } from '../src/components/KitsView';
import { INITIAL_SOLAR_KITS } from '../src/data/initialKits';

test('KitsView renders without throwing and includes kits catalog', () => {
  const dummyTheme = {
    primary: '#183956',
    secondary: '#0076DD',
    background: '#0E2337',
    accent: '#B4BF8A',
    border: '#35536E',
    text: '#FFFFFF',
  };

  const html = renderToString(
    React.createElement(KitsView, {
      theme: dummyTheme,
      onShowToast: () => {},
    })
  );

  assert.ok(html.includes('Kits Fotovoltaicos'), 'Deve conter o título Kits Fotovoltaicos');
  assert.ok(html.includes('Novo Kit') || html.includes('Adicionar Kit'), 'Deve conter o botão de adicionar kit');
  assert.ok(html.includes('On-Grid'), 'Deve conter kits On-Grid');
});
