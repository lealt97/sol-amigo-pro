import type {
  PdfEditorialSettings,
  PdfInternalPage,
  PdfSettingsConfig,
  SolarProposal,
} from "../types";

export const EDITORIAL_PAGES: PdfInternalPage[] = [
  {
    id: "project",
    enabled: true,
    label: "Proposta comercial",
    title: "Seu projeto de energia solar",
    intro: "Sistema recomendado para o seu consumo.",
    text: "Geração e economia estimadas conforme os dados do projeto. Os resultados reais variam conforme as condições de operação e faturamento.",
  },
  {
    id: "equipment",
    enabled: true,
    label: "Materiais e serviços",
    title: "O que compõe a sua solução",
    intro: "Relação dos materiais previstos para instalação.",
    text: "Projeto e dimensionamento\nInstalação e comissionamento\nHomologação conforme escopo contratado\nMonitoramento conforme escopo contratado",
    details:
      "Adequações civis e elétricas adicionais devem ser confirmadas antes da contratação.",
  },
  {
    id: "commercial",
    enabled: true,
    label: "Investimento e contratação",
    title: "Condições da proposta",
    intro: "Valores, prazos e aceite.",
    text: "O aceite confirma os equipamentos, serviços e condições descritos nesta proposta. Alterações de escopo devem ser formalizadas entre as partes.",
  },
];

export function normalizeEditorialSettings(
  settings?: Partial<PdfEditorialSettings>,
): PdfEditorialSettings {
  const previous = Array.isArray(settings?.pages) ? settings.pages : [];
  const supplied = settings?.layoutVersion === 2 ? previous : [];
  const pages = supplied
    .filter(
      (p, i) =>
        EDITORIAL_PAGES.some((d) => d.id === p.id) &&
        supplied.findIndex((x) => x.id === p.id) === i,
    )
    .map((p) => ({ ...EDITORIAL_PAGES.find((d) => d.id === p.id)!, ...p }));
  for (const page of EDITORIAL_PAGES)
    if (!pages.some((p) => p.id === page.id)) pages.push({ ...page });
  return {
    layoutVersion: 2,
    useCoverColors: settings?.useCoverColors ?? true,
    representativeName: settings?.representativeName ?? "",
    companyName: settings?.companyName ?? "Sol Amigo",
    companyEmail: settings?.companyEmail ?? "",
    companyPhone: settings?.companyPhone ?? "",
    companyDocument: settings?.companyDocument ?? "",
    companyAddress: settings?.companyAddress ?? "",
    footerText: settings?.footerText ?? "Projeto claro. Decisão segura.",
    primary: settings?.primary ?? "#0E2337",
    secondary: settings?.secondary ?? "#0076DD",
    accent: settings?.accent ?? "#FACB5C",
    fontSize: Math.max(9, Math.min(13, Number(settings?.fontSize) || 10)),
    validityDays: Math.max(
      1,
      Math.min(365, Number(settings?.validityDays) || 10),
    ),
    pages,
  };
}

export function cloneEditorialSettings(
  settings?: Partial<PdfEditorialSettings>,
) {
  const normalized = normalizeEditorialSettings(settings);
  return { ...normalized, pages: normalized.pages.map((p) => ({ ...p })) };
}

export const numberText = (value?: number | null, suffix = "", digits = 2) =>
  Number.isFinite(value)
    ? `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: digits })}${suffix}`
    : "Não informado";
export const moneyText = (value?: number | null) =>
  Number.isFinite(value)
    ? Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
    : "Não informado";
export const dateText = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" })
    : "Não informada";

export function getProposalSeries(proposal: SolarProposal) {
  const consumption =
    proposal.pdfData?.monthlyConsumptionKWh ??
    proposal.sizing?.monthlyConsumptionKWh;
  const generation =
    proposal.pdfData?.monthlyGenerationKWh ??
    proposal.sizing?.monthlyGenerationKWh;
  return {
    consumption: Array.from(
      { length: 12 },
      (_, i) => consumption?.[i] ?? proposal.monthlyConsumptionKWh,
    ),
    generation: Array.from(
      { length: 12 },
      (_, i) => generation?.[i] ?? proposal.estimatedMonthlyGenKWh,
    ),
    consumptionIsAverage:
      !consumption ||
      consumption.length !== 12 ||
      consumption.some((v) => v == null),
    generationIsAverage: !generation || generation.length !== 12,
  };
}

export function getVisibleEditorialPages(settings: PdfSettingsConfig) {
  return normalizeEditorialSettings(settings.editorial).pages.filter(
    (p) => p.enabled && (p.id !== "equipment" || settings.showEquipment),
  );
}

export const EDITORIAL_PREVIEW_PROPOSAL: SolarProposal = {
  id: "editorial-preview",
  code: "PRÉVIA",
  clientName: "Cliente de exemplo",
  clientCity: "Cidade",
  clientState: "UF",
  concessionaria: "Distribuidora de exemplo",
  monthlyConsumptionKWh: 600,
  systemPowerKWp: 5.5,
  systemType: "On-Grid",
  estimatedMonthlyGenKWh: 660,
  modulesCount: 10,
  moduleModel: "Módulo de exemplo 550 W",
  inverterModel: "Inversor de exemplo 5 kW",
  totalValue: 25000,
  estimatedMonthlySavings: 500,
  paybackYears: 4.17,
  status: "Rascunho",
  createdAt: "2026-10-04T12:00:00Z",
  hsp: 5,
  performanceRatio: 80,
  pdfData: {
    connectionType: "Bifásica",
    modulePowerW: 550,
    inverterPowerKW: 5,
    inverterCount: 1,
    estimatedAreaM2: 25.8,
    energyTariff: 0.92,
    targetCoveragePercent: 100,
  },
};
