import type {
  PdfEditorialSettings,
  PdfInternalPage,
  PdfSettingsConfig,
  SolarProposal,
} from "../types";

export const EDITORIAL_PAGES: PdfInternalPage[] = [
  {
    id: "benefits",
    enabled: true,
    label: "Energia solar",
    title: "Mais controle sobre o custo da sua energia",
    intro:
      "A geração fotovoltaica converte a luz do sol em eletricidade e atende parte do consumo conforme as regras aplicáveis à unidade consumidora.",
    text: "Economia recorrente | Redução estimada da energia faturável.\nProteção tarifária | Menor exposição a reajustes futuros.\nValorização | Infraestrutura energética incorporada ao imóvel.\nBaixa manutenção | Sistema silencioso e monitorável.",
  },
  {
    id: "project",
    enabled: true,
    label: "Descrição do projeto",
    title: "Dimensionamento alinhado ao perfil de consumo",
    intro:
      "Sistema recomendado a partir das informações registradas nesta proposta. A execução depende da validação técnica do local.",
    text: "A conta continua sujeita a cobranças residuais, encargos, tributos e regras da distribuidora. A geração estimada não representa redução idêntica da fatura.",
  },
  {
    id: "generation",
    enabled: true,
    label: "Geração estimada",
    title: "Consumo e geração mês a mês",
    intro:
      "Comparativo energético baseado no histórico e nas premissas registradas.",
    text: "Quando não houver histórico mensal ou irradiação mensal, a apresentação identifica o uso de médias. A produção real varia conforme clima, orientação, sombreamento e condições de operação.",
  },
  {
    id: "equipment",
    enabled: true,
    label: "Composição do sistema",
    title: "Uma solução completa pronta para operar",
    intro: "Equipamentos, serviços e componentes considerados nesta proposta.",
    text: "A compatibilidade elétrica e as especificações finais devem ser verificadas no projeto executivo. Garantias conforme fabricante e condições comerciais registradas.",
  },
  {
    id: "technical",
    enabled: true,
    label: "Dados técnicos",
    title: "Os dados que sustentam o dimensionamento",
    intro: "Memorial de cálculo, premissas e informações técnicas do sistema.",
    text: "O dimensionamento definitivo considera histórico de consumo, irradiação, temperatura, sombreamento, perdas elétricas e compatibilidade entre módulos, inversor e baterias. Valores não registrados aparecem como não informados.",
  },
  {
    id: "financial",
    enabled: true,
    label: "Análise financeira",
    title: "Economia e retorno do investimento",
    intro:
      "Investimento e retorno simples conforme os resultados salvos na proposta.",
    text: "O payback simples utiliza investimento dividido pela economia anual estimada. A projeção linear não inclui reajuste tarifário, degradação, manutenção, financiamento ou substituição de equipamentos; não equivale a VPL ou TIR.",
  },
  {
    id: "commercial",
    enabled: true,
    label: "Condições comerciais",
    title: "Escolha a condição que melhor encaixa no seu orçamento",
    intro: "Valor, pagamento e condições de fornecimento desta proposta.",
    text: "Condições de crédito, taxas e parcelas dependem da instituição financeira e da aprovação cadastral. Nenhuma parcela é calculada sem as condições correspondentes.",
  },
  {
    id: "execution",
    enabled: true,
    label: "Execução e garantias",
    title: "Etapas, escopo e segurança para contratar",
    intro: "Cronograma de referência e responsabilidades de entrega.",
    text: "Validação técnica | Prazo a confirmar após vistoria.\nProjeto e homologação | Conforme distribuidora e escopo contratado.\nInstalação | Conforme disponibilidade e condições do local.\nVistoria e ativação | Conforme distribuidora.",
  },
  {
    id: "acceptance",
    enabled: true,
    label: "Próximo passo",
    title: "Pronto para gerar sua própria energia?",
    intro:
      "Confirme os dados, o escopo e as condições comerciais com seu consultor para avançar.",
    text: "A contratação depende do aceite, contrato, vistoria, disponibilidade de equipamentos e condições registradas nesta proposta.",
  },
];

export function normalizeEditorialSettings(
  settings?: Partial<PdfEditorialSettings>,
): PdfEditorialSettings {
  const supplied = Array.isArray(settings?.pages) ? settings.pages : [];
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
    (p) =>
      p.enabled &&
      (p.id !== "financial" || settings.showFinancial) &&
      (p.id !== "equipment" || settings.showEquipment),
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
