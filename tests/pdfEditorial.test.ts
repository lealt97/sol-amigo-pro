import assert from "node:assert/strict";
import test from "node:test";
import {
  cloneEditorialSettings,
  EDITORIAL_PAGES,
  EDITORIAL_PREVIEW_PROPOSAL,
  getProposalSeries,
  getVisibleEditorialPages,
  normalizeEditorialSettings,
} from "../src/utils/pdfEditorial";
import { DEFAULT_PDF_SETTINGS } from "../src/utils/themeEngine";
import { clonePdfSettingsForModel } from "../src/utils/pdfCoverModels";

// CSS is loaded by the browser build; the pure utilities are exercised here.
test("modelo editorial contém as nove páginas internas sem uma segunda capa", () => {
  assert.equal(EDITORIAL_PAGES.length, 9);
  assert.equal(new Set(EDITORIAL_PAGES.map((p) => p.id)).size, 9);
  assert.ok(!EDITORIAL_PAGES.some((p) => p.id === ("cover" as any)));
});
test("modelos de capa preservam cópias independentes das páginas internas", () => {
  const source = {
    ...DEFAULT_PDF_SETTINGS,
    editorial: normalizeEditorialSettings(),
  };
  const copy = clonePdfSettingsForModel(source);
  copy.editorial!.pages[0].title = "Título da cópia";
  assert.notEqual(
    copy.editorial!.pages[0].title,
    source.editorial.pages[0].title,
  );
});
test("configurações antigas recebem páginas internas e ordem personalizada permanece", () => {
  const ed = normalizeEditorialSettings({
    pages: [
      { ...EDITORIAL_PAGES[8], title: "Meu aceite" },
      { ...EDITORIAL_PAGES[0], enabled: false },
    ],
  });
  assert.equal(ed.pages[0].id, "acceptance");
  assert.equal(ed.pages[0].title, "Meu aceite");
  assert.equal(ed.pages.length, 9);
  const settings = {
    ...DEFAULT_PDF_SETTINGS,
    showFinancial: false,
    editorial: ed,
  };
  assert.ok(
    !getVisibleEditorialPages(settings).some(
      (p) => p.id === "benefits" || p.id === "financial",
    ),
  );
});
test("gráfico conserva histórico mensal e sinaliza dados apresentados como médias", () => {
  const proposal = {
    ...EDITORIAL_PREVIEW_PROPOSAL,
    pdfData: {
      monthlyConsumptionKWh: [
        0,
        120,
        null,
        300,
        400,
        500,
        600,
        700,
        800,
        900,
        1000,
        1100,
      ],
    },
  };
  const series = getProposalSeries(proposal);
  assert.equal(series.consumption[0], 0);
  assert.equal(series.consumption[1], 120);
  assert.equal(series.consumption[2], proposal.monthlyConsumptionKWh);
  assert.equal(series.consumptionIsAverage, true);
  assert.equal(series.generationIsAverage, true);
});
test("descartar alterações não compartilha textos de páginas entre cópias", () => {
  const ed = normalizeEditorialSettings();
  const copy = cloneEditorialSettings(ed);
  copy.pages[2].intro = "Alterado";
  assert.notEqual(ed.pages[2].intro, copy.pages[2].intro);
});

test("salvar e reabrir proposta conserva o snapshot técnico e comercial", async () => {
  const store = new Map<string, string>();
  const previousWindow = globalThis.window;
  const previousStorage = globalThis.localStorage;
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
  };
  (globalThis as any).window = {
    localStorage: globalThis.localStorage,
    dispatchEvent: () => true,
  };
  try {
    const { createQuickProposalForClient, getStoredProposalsLocal } =
      await import("../src/services/proposals");
    const snapshot = structuredClone(EDITORIAL_PREVIEW_PROPOSAL);
    await createQuickProposalForClient({
      clientId: "client-real-id",
      clientName: snapshot.clientName,
      code: snapshot.code,
      snapshot,
    });
    snapshot.pdfData!.modulePowerW = 999;
    const saved = getStoredProposalsLocal()[0];
    assert.equal(saved.clientId, "client-real-id");
    assert.equal(saved.code, EDITORIAL_PREVIEW_PROPOSAL.code);
    assert.equal(saved.snapshot?.pdfData?.modulePowerW, 550);
    assert.equal(saved.snapshot?.paybackYears, 4.17);
    assert.equal(saved.snapshot?.clientCity, "Cidade");
  } finally {
    (globalThis as any).window = previousWindow;
    (globalThis as any).localStorage = previousStorage;
  }
});
