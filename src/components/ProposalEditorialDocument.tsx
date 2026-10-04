import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  PdfInternalPage,
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
} from "../types";
import {
  dateText,
  getProposalSeries,
  getVisibleEditorialPages,
  moneyText,
  normalizeEditorialSettings,
  numberText,
} from "../utils/pdfEditorial";
import {
  getPdfCoverAssetUrl,
  getPdfCoverTemplate,
} from "../data/pdfCoverTemplates";
import { buildCoverSvg } from "../utils/pdfCoverEditor";
import "./proposalEditorial.css";

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];
type Row = [string, string];
const Table = ({ rows }: { rows: Row[] }) => (
  <table className="editorial-table">
    <thead>
      <tr>
        <th>Parâmetro</th>
        <th>Valor</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(([key, value], i) => (
        <tr key={`${key}-${i}`}>
          <th>{key}</th>
          <td>{value || "Não informado"}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
const Metrics = ({ items }: { items: Row[] }) => (
  <div className="editorial-metrics">
    {items.map(([label, value]) => (
      <div key={label}>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    ))}
  </div>
);
const Note = ({ children }: { children: React.ReactNode }) => (
  <div className="editorial-note">{children}</div>
);
const safeImage = (url?: string) =>
  url && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(url)
    ? url
    : undefined;

function FinancialChart({ proposal: p }: { proposal: SolarProposal }) {
  const annual = p.estimatedMonthlySavings * 12;
  if (!(annual > 0) || !Number.isFinite(p.totalValue))
    return (
      <Note>
        Projeção indisponível: informe investimento e economia estimada.
      </Note>
    );
  const max = Math.max(annual * 8, p.totalValue, 1),
    y = (v: number) => 160 - (v / max) * 140;
  return (
    <div className="model-box model-return">
      <h3>Retorno acumulado — gráfico em barras verticais</h3>
      <svg
        viewBox="0 0 500 205"
        role="img"
        aria-label="Economia acumulada em oito anos e referência do investimento"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="38"
              x2="485"
              y1={160 - i * 35}
              y2={160 - i * 35}
              stroke="#e3eaf0"
            />
            <text
              x="32"
              y={163 - i * 35}
              textAnchor="end"
              fontSize="8"
              fill="#8296a8"
            >
              {Math.round((max * i) / 4000)}k
            </text>
          </g>
        ))}
        <line
          x1="38"
          x2="485"
          y1={y(p.totalValue)}
          y2={y(p.totalValue)}
          stroke="var(--ed-accent)"
        />
        <text x="40" y={y(p.totalValue) - 5} fontSize="8" fill="#ad8520">
          INVESTIMENTO
        </text>
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <rect
              x={44 + i * 49}
              y={y(i * annual)}
              width="27"
              height={((i * annual) / max) * 140}
              rx="4"
              fill={
                i * annual >= p.totalValue ? "#b2bf8a" : "var(--ed-secondary)"
              }
            />
            <text
              x={57 + i * 49}
              y="177"
              textAnchor="middle"
              fontSize="9"
              fill="#8296a8"
            >
              {i}
            </text>
            {i === Math.ceil(p.totalValue / annual) && (
              <text
                x={57 + i * 49}
                y={y(i * annual) - 8}
                textAnchor="middle"
                fontSize="8"
              >
                PAYBACK
              </text>
            )}
          </g>
        ))}
        <text x="255" y="198" fontSize="9" fill="#8296a8">
          Ano
        </text>
      </svg>
    </div>
  );
}

export function getTechnicalRows(p: SolarProposal): Row[] {
  const d = p.pdfData,
    s = p.sizing;
  return [
    ["Tipo de sistema", p.systemType || "Não informado"],
    ["Potência instalada", numberText(p.systemPowerKWp, " kWp")],
    [
      "Módulos",
      `${numberText(p.modulesCount, "", 0)} × ${numberText(d?.modulePowerW ?? s?.modulePowerW, " W")}`,
    ],
    ["Modelo do módulo", p.moduleModel],
    ["Modelo do inversor", p.inverterModel],
    [
      "Potência e quantidade de inversores",
      `${numberText(d?.inverterPowerKW ?? s?.inverterPowerKW, " kW")} / ${numberText(d?.inverterCount ?? s?.inverterCount, "", 0)}`,
    ],
    [
      "Ligação elétrica",
      d?.connectionType ?? s?.connectionType ?? "Não informado",
    ],
    ["Distribuidora", p.concessionaria],
    ["Consumo médio", numberText(p.monthlyConsumptionKWh, " kWh/mês")],
    ["Geração média", numberText(p.estimatedMonthlyGenKWh, " kWh/mês")],
    [
      "Geração anual estimada",
      numberText(
        s?.estimatedAnnualGenerationKWh ?? p.estimatedMonthlyGenKWh * 12,
        " kWh/ano",
      ),
    ],
    ["HSP adotada", numberText(p.hsp ?? s?.averageCorrectedSunHours, " h/dia")],
    [
      "Rendimento global (PR)",
      numberText(
        p.performanceRatio ?? (s ? s.performanceRatio * 100 : undefined),
        " %",
      ),
    ],
    [
      "Perdas globais",
      numberText(
        s?.totalLossPercent ??
          (p.performanceRatio != null ? 100 - p.performanceRatio : undefined),
        " %",
      ),
    ],
    [
      "Cobertura desejada",
      numberText(d?.targetCoveragePercent ?? s?.targetCoveragePercent, " %"),
    ],
    [
      "Área estimada dos módulos",
      numberText(d?.estimatedAreaM2 ?? s?.estimatedAreaM2, " m²"),
    ],
    [
      "Relação CC/CA",
      numberText(
        s?.dcAcRatio ??
          (d?.inverterPowerKW && d.inverterCount
            ? p.systemPowerKWp / (d.inverterPowerKW * d.inverterCount)
            : undefined),
      ),
    ],
    ["Estrutura / telhado", d?.structureType ?? s?.roofType ?? "Não informado"],
    ["Orientação", s?.roofOrientation ?? "Não informado"],
    ["Sombreamento", s?.roofShading ?? "Não informado"],
    ["Fator de inclinação", numberText(s?.inclinationFactor)],
    ...(s
      ? ([
          ["Perda por temperatura", numberText(s.temperatureLossPercent, " %")],
          ["Outras perdas", numberText(s.otherLossesPercent, " %")],
          [
            "Perda do transformador",
            numberText(s.transformerLossPercent, " %"),
          ],
          ["Fonte de HSP", s.hspSource || "Não informado"],
          [
            "Consumo compensável",
            numberText(s.compensableConsumptionKWh, " kWh/mês"),
          ],
          [
            "Consumo de projeto",
            numberText(s.designConsumptionKWh, " kWh/mês"),
          ],
          ["Cobertura estimada", numberText(s.estimatedCoveragePercent, " %")],
          [
            "Potência teórica antes das perdas",
            numberText(s.theoreticalPowerKWp, " kWp"),
          ],
          ["Verificação CC/CA", s.dcAcStatus],
          ["Situação do estudo", s.status],
        ] as Row[])
      : []),
    [
      "Tarifa adotada",
      d?.energyTariff != null
        ? `${moneyText(d.energyTariff)}/kWh`
        : "Não informado",
    ],
    ["Iluminação pública", moneyText(d?.publicLightingTax)],
    ["Consumo futuro", numberText(s?.futureConsumptionKWh, " kWh/mês")],
    [
      "Disponibilidade adotada",
      numberText(
        s?.availabilityCostKWh ??
          (d?.connectionType
            ? { Monofásica: 30, Bifásica: 50, Trifásica: 100 }[d.connectionType]
            : undefined),
        " kWh",
      ),
    ],
    ["Potência requerida", numberText(s?.requiredPowerKWp, " kWp")],
    [
      "Versão do cálculo",
      s?.calculationVersion ?? "Pré-dimensionamento mensal do wizard",
    ],
    ...(p.systemType === "Híbrido"
      ? ([
          ["Modelo de bateria", p.batteryModel ?? "Não informado"],
          [
            "Capacidade por bateria",
            numberText(
              d?.batteryUnitCapacityKWh ?? s?.batteryCapacityKWh,
              " kWh",
            ),
          ],
          ["Quantidade de baterias", numberText(p.batteryCount, "", 0)],
          [
            "Capacidade nominal do banco",
            numberText(
              p.batteryCapacityKWh ?? s?.batteryTotalCapacityKWh,
              " kWh",
            ),
          ],
          [
            "Autonomia solicitada",
            numberText(d?.backupAutonomyHours ?? s?.backupAutonomyHours, " h"),
          ],
          ["Autonomia calculada", numberText(s?.batteryAutonomyHours, " h")],
          [
            "Energia útil do banco",
            numberText(s?.installedUsableBatteryKWh, " kWh"),
          ],
          [
            "Energia das cargas prioritárias",
            numberText(s?.backupEnergyKWh, " kWh"),
          ],
          [
            "Potência simultânea de backup",
            numberText(s?.backupSimultaneousPowerKW, " kW"),
          ],
          ["Pico de partida", numberText(s?.backupSurgePowerKW, " kW")],
          ["DoD", numberText(s?.batteryDepthOfDischarge, " %")],
          ["Reserva de bateria", numberText(s?.batteryReservePercent, " %")],
          [
            "Eficiência da bateria",
            numberText(s?.batteryEfficiencyPercent, " %"),
          ],
          [
            "Eficiência do inversor híbrido",
            numberText(s?.hybridInverterEfficiencyPercent, " %"),
          ],
          [
            "Banco requerido pelo motor técnico",
            numberText(s?.requiredBatteryCapacityKWh, " kWh"),
          ],
          [
            "Quantidade requerida pelo motor técnico",
            numberText(s?.requiredBatteryCount, "", 0),
          ],
          [
            "Potência mínima do inversor híbrido",
            numberText(s?.minimumHybridInverterPowerKW, " kW"),
          ],
          [
            "Potência híbrida informada",
            numberText(s?.hybridInverterPowerKW, " kW"),
          ],
          [
            "Surto do inversor informado",
            numberText(s?.hybridInverterSurgePowerKW, " kW"),
          ],
          [
            "Recomendação simplificada do wizard",
            numberText(d?.batteryRecommendationKWh, " kWh"),
          ],
        ] as Row[])
      : []),
  ];
}

export const ProposalEditorialDocument: React.FC<{
  proposal: SolarProposal;
  settings: PdfSettingsConfig;
  theme: ThemeConfig;
  includeCover?: boolean;
  onlyPageId?: string;
  preview?: boolean;
}> = ({
  proposal: p,
  settings,
  theme,
  includeCover = true,
  onlyPageId,
  preview = false,
}) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const ed = normalizeEditorialSettings(settings.editorial);
  const [coverSvg, setCoverSvg] = useState("");
  const [coverError, setCoverError] = useState(false);
  const cover = getPdfCoverTemplate(settings.template);
  useEffect(() => {
    if (!includeCover) return;
    let alive = true;
    setCoverSvg("");
    setCoverError(false);
    fetch(getPdfCoverAssetUrl(cover.file))
      .then((r) => {
        if (!r.ok) throw new Error("Capa indisponível");
        return r.text();
      })
      .then((raw) => {
        if (alive)
          setCoverSvg(
            buildCoverSvg(raw, {
              colorOverrides: settings.coverColors,
              logoUrl: settings.showLogo ? settings.customLogoUrl : undefined,
              photoUrl: settings.showCoverPhoto
                ? settings.customCoverUrl
                : undefined,
              logoTransform: settings.coverLogoTransform,
              photoTransform: settings.coverPhotoTransform,
              logoSlot: cover.logoSlot,
            }),
          );
      })
      .catch(() => {
        if (alive) setCoverError(true);
      });
    return () => {
      alive = false;
    };
  }, [includeCover, cover.file, settings]);
  const pages = getVisibleEditorialPages(settings).filter(
    (page) => !onlyPageId || page.id === onlyPageId,
  );
  const rows = getTechnicalRows(p);
  const rowsPerSheet =
    ed.fontSize > 11 ||
    ed.pages.find((page) => page.id === "technical")?.imageUrl
      ? 9
      : 14;
  const chunks: Row[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerSheet)
    chunks.push(rows.slice(i, i + rowsPerSheet));
  const series = getProposalSeries(p);
  const annual = p.estimatedMonthlySavings * 12;
  const validity =
    p.validUntil ||
    (p.createdAt && !Number.isNaN(Date.parse(p.createdAt))
      ? new Date(
          Date.parse(p.createdAt) + ed.validityDays * 86400000,
        ).toISOString()
      : undefined);
  const env: Row[] = [
    [
      "CO₂ evitado",
      numberText(p.co2SavedTonsYear ?? p.co2AvoidedTons, " t/ano"),
    ],
    [
      "Árvores equivalentes",
      numberText(p.treesEquivalent ?? p.treesPlanted, "", 0),
    ],
  ];
  const style = {
    "--ed-primary": ed.primary,
    "--ed-secondary": ed.secondary,
    "--ed-accent": ed.accent,
    "--ed-font-size": `${ed.fontSize}pt`,
    fontFamily: `${settings.font}, Arial, sans-serif`,
  } as React.CSSProperties;
  let number = includeCover ? 1 : 0;
  function sheet(
    page: PdfInternalPage,
    content: React.ReactNode,
    continuation = "",
    key = page.id as string,
  ) {
    const n = ++number;
    return (
      <article className="editorial-sheet" key={key} data-page={page.id}>
        <div className="editorial-page-inner">
          <header className="editorial-header">
            <div>
              {settings.showLogo && safeImage(settings.customLogoUrl) ? (
                <img
                  src={safeImage(settings.customLogoUrl)}
                  alt={ed.companyName}
                />
              ) : (
                <strong>{ed.companyName}</strong>
              )}
            </div>
            <span>
              {page.label}
              <small>{page.intro}</small>
            </span>
          </header>
          <div className="editorial-page-heading">
            <h1>
              {page.title}
              {continuation}
            </h1>
            <p>{page.intro}</p>
          </div>
          {safeImage(page.imageUrl) && !continuation && (
            <img
              className="editorial-page-image"
              src={safeImage(page.imageUrl)}
              alt={page.label}
            />
          )}
          <div className="editorial-content">{content}</div>
          {settings.showFooter && (
            <div className="editorial-footer">
              <span>{ed.companyName}</span>
              <span>{preview ? "PRÉVIA • DADOS DE EXEMPLO" : p.code}</span>
              <span>Página {n}</span>
            </div>
          )}
        </div>
      </article>
    );
  }
  useLayoutEffect(() => {
    let alive = true;
    const fit = () => {
      if (!alive) return;
      documentRef.current
        ?.querySelectorAll<HTMLElement>(".editorial-page-inner")
        .forEach((inner) => {
          inner.style.transform = "none";
          inner.style.width = "100%";
          inner.style.minHeight = "267mm";
          const available = (267 * 96) / 25.4;
          const height = inner.getBoundingClientRect().height;
          if (height > available + 1) {
            const scale = available / height;
            inner.style.transform = `scale(${scale})`;
            inner.style.width = `${100 / scale}%`;
            inner.style.minHeight = `${267 / scale}mm`;
          }
        });
    };
    fit();
    void document.fonts.ready.then(fit);
    const images: HTMLImageElement[] = Array.from(
      documentRef.current?.querySelectorAll<HTMLImageElement>("img") ?? [],
    );
    images.forEach((img) => img.addEventListener("load", fit));
    return () => {
      alive = false;
      images.forEach((img) => img.removeEventListener("load", fit));
    };
  }, [settings, p, includeCover, onlyPageId]);
  return (
    <div ref={documentRef} className="editorial-document" style={style}>
      {includeCover && (
        <article className="editorial-sheet editorial-cover" data-page="cover">
          {coverSvg ? (
            <div
              className="editorial-cover-art"
              dangerouslySetInnerHTML={{ __html: coverSvg }}
            />
          ) : (
            <div className="editorial-cover-art editorial-muted">
              {coverError
                ? "Não foi possível carregar a capa selecionada. Tente novamente antes de imprimir."
                : "Carregando capa…"}
            </div>
          )}
        </article>
      )}
      {pages.flatMap((page) => {
        const d = p.pdfData,
          sizing = p.sizing;
        const availability =
          sizing?.availabilityCostKWh ??
          (d?.connectionType
            ? { Monofásica: 30, Bifásica: 50, Trifásica: 100 }[d.connectionType]
            : undefined);
        const compensable =
          sizing?.compensableConsumptionKWh ??
          (availability != null
            ? Math.max(0, p.monthlyConsumptionKWh - availability)
            : undefined);
        const daily =
          sizing?.designConsumptionKWh != null
            ? sizing.designConsumptionKWh / 30
            : compensable != null
              ? compensable / 30
              : undefined;
        const hsp = p.hsp ?? sizing?.averageCorrectedSunHours,
          pr =
            p.performanceRatio != null
              ? p.performanceRatio / 100
              : sizing?.performanceRatio;
        const calculated =
          sizing?.requiredPowerKWp ??
          (daily != null && hsp && pr ? daily / (hsp * pr) : undefined);
        const maintenance = p.maintenancePlan?.enabled
          ? p.maintenancePlan
          : undefined;
        const payback =
          p.paybackYears > 0
            ? `${Math.floor(p.paybackYears)} anos e ${Math.round((p.paybackYears % 1) * 12)} meses`
            : "Não calculado";
        if (page.id === "project")
          return [
            sheet(
              page,
              <>
                <Metrics
                  items={[
                    [
                      "Consumo médio",
                      numberText(p.monthlyConsumptionKWh, " kWh/mês", 0),
                    ],
                    ["Potência calculada", numberText(calculated, " kWp")],
                    [
                      "Potência instalada",
                      numberText(p.systemPowerKWp, " kWp"),
                    ],
                    [
                      "Geração estimada",
                      numberText(p.estimatedMonthlyGenKWh, " kWh/mês", 0),
                    ],
                  ]}
                />
                <div className="model-box model-memorial">
                  <h3>Memorial de cálculo simplificado</h3>
                  <div className="model-grid">
                    <p>
                      1. Consumo mensal{" "}
                      <b>{numberText(p.monthlyConsumptionKWh, " kWh/mês")}</b>
                    </p>
                    <p>
                      2. Disponibilidade (
                      {d?.connectionType ??
                        sizing?.connectionType ??
                        "não informada"}
                      ) <b>{numberText(availability, " kWh")}</b>
                    </p>
                    <p>
                      3. Consumo compensável{" "}
                      <b>{numberText(compensable, " kWh/mês")}</b>
                    </p>
                    <p>
                      4. Energia diária{" "}
                      <b>{numberText(daily, " kWh/dia", 3)}</b>
                    </p>
                  </div>
                  <strong>
                    P FV = {numberText(daily)} / ({numberText(hsp)} ×{" "}
                    {numberText(pr)}) = {numberText(calculated, " kWp")}
                  </strong>
                  <small>
                    Arredondamento físico: {numberText(p.modulesCount, "", 0)} ×{" "}
                    {numberText(d?.modulePowerW ?? sizing?.modulePowerW, " W")}{" "}
                    = {numberText(p.systemPowerKWp, " kWp instalados")}
                  </small>
                </div>
                <Table
                  rows={[
                    [
                      "Tipo de sistema / Concessionária",
                      `${p.systemType} / ${p.concessionaria}`,
                    ],
                    [
                      "Ligação / HSP adotada",
                      `${d?.connectionType ?? sizing?.connectionType ?? "Não informado"} / ${numberText(hsp, " h/dia")}`,
                    ],
                    [
                      "Fator de rendimento / Módulos",
                      `${numberText(pr != null ? pr * 100 : undefined, " %")} / ${numberText(p.modulesCount, "", 0)} × ${numberText(d?.modulePowerW ?? sizing?.modulePowerW, " W")}`,
                    ],
                    [
                      "Geração média / Cobertura estimada",
                      `${numberText(p.estimatedMonthlyGenKWh, " kWh/mês")} / ${numberText(sizing?.estimatedCoveragePercent ?? (p.monthlyConsumptionKWh > 0 ? (p.estimatedMonthlyGenKWh / p.monthlyConsumptionKWh) * 100 : undefined), " %")}`,
                    ],
                  ]}
                />
                <p className="editorial-muted model-bottom-note">{page.text}</p>
              </>,
            ),
            ...(p.sizing ||
            p.systemType === "Híbrido" ||
            p.pdfData?.loads?.length ||
            p.pdfData?.monthlyConsumptionKWh
              ? chunks.map((chunk, i) =>
                  sheet(
                    page,
                    <>
                      <h3>Dados completos do dimensionamento</h3>
                      <Table rows={chunk} />
                      {i === chunks.length - 1 && (
                        <>
                          <Table
                            rows={MONTHS.map(
                              (month, j) =>
                                [
                                  month,
                                  `${numberText(series.consumption[j], " kWh consumidos")} / ${numberText(series.generation[j], " kWh gerados")}`,
                                ] as Row,
                            )}
                          />
                          <Note>
                            {series.consumptionIsAverage ||
                            series.generationIsAverage
                              ? "Os meses sem histórico são apresentados pela média registrada."
                              : "Histórico mensal registrado."}
                          </Note>
                          {p.sizing?.notes && <Note>{p.sizing.notes}</Note>}
                        </>
                      )}
                    </>,
                    " · memorial completo",
                    `project-details-${i}`,
                  ),
                )
              : []),
            ...(d?.loads?.length
              ? Array.from({ length: Math.ceil(d.loads.length / 10) }, (_, i) =>
                  sheet(
                    page,
                    <>
                      <h3>Levantamento de cargas</h3>
                      <Table
                        rows={d
                          .loads!.slice(i * 10, (i + 1) * 10)
                          .map((l) => [
                            l.name,
                            `${l.quantity} × ${l.powerW} W · ${l.hoursPerDay} h/dia · ${l.daysPerMonth} dias/mês · backup ${l.isPriorityBackup ? "sim" : "não"}`,
                          ])}
                      />
                    </>,
                    " · cargas",
                    `project-loads-${i}`,
                  ),
                )
              : []),
          ];
        if (page.id === "equipment") {
          const items = d?.equipmentItems ?? p.pricing?.equipmentItems;
          const kit = items?.length
            ? items.map((x) => [
                x.category,
                numberText(x.quantity, "", 0),
                x.description,
              ])
            : [
                [
                  "Módulos fotovoltaicos",
                  numberText(p.modulesCount, "", 0),
                  p.moduleModel,
                ],
                [
                  "Inversor solar",
                  numberText(d?.inverterCount ?? sizing?.inverterCount, "", 0),
                  p.inverterModel,
                ],
                [
                  "Estrutura de fixação",
                  "Conforme projeto",
                  d?.structureType ?? sizing?.roofType ?? "Não informado",
                ],
                ...(p.systemType === "Híbrido"
                  ? [
                      [
                        "Baterias",
                        numberText(p.batteryCount, "", 0),
                        p.batteryModel ?? "Não informado",
                      ],
                    ]
                  : []),
              ];
          return Array.from({ length: Math.ceil(kit.length / 10) }, (_, i) =>
            sheet(
              page,
              <>
                <p className="editorial-muted">
                  {p.selectedKitName ||
                    `${p.systemType} · ${numberText(p.systemPowerKWp, " kWp")}`}
                </p>
                <table className="model-kit">
                  <thead>
                    <tr>
                      {["Item", "Qtd.", "Descrição / modelo", "Garantia"].map(
                        (x) => (
                          <th key={x}>{x}</th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {kit.slice(i * 10, (i + 1) * 10).map((row, j) => (
                      <tr key={j}>
                        {row.map((x, k) => (
                          <td key={k}>{x}</td>
                        ))}
                        <td>
                          {p.commercialConditions?.warrantyTerms ||
                            "Conforme fabricante / contrato"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="model-box model-green">
                  <h3>Plano de manutenção {maintenance ? "incluído" : ""}</h3>
                  <strong>{maintenance?.name ?? "Não contratado"}</strong>
                  {maintenance && (
                    <>
                      <p>
                        {numberText(
                          maintenance.visitsPerYear,
                          " visitas por ano",
                          0,
                        )}{" "}
                        | periodicidade:{" "}
                        {numberText(
                          maintenance.frequencyInterval ??
                            maintenance.frequencyMonths,
                        )}{" "}
                        {maintenance.frequencyUnit ?? "meses"} | valor anual:{" "}
                        {moneyText(maintenance.annualPrice)}
                      </p>
                      <ul className="model-checks">
                        {maintenance.includedServices.map((x, j) => (
                          <li key={j}>{x}</li>
                        ))}
                      </ul>
                      <p>{maintenance.notes}</p>
                    </>
                  )}
                </div>
                <div className="model-grid">
                  <div className="model-box">
                    <h3>Serviços incluídos no sistema</h3>
                    <ul className="model-checks">
                      {page.text
                        .split("\n")
                        .filter(Boolean)
                        .map((x, j) => (
                          <li key={j}>{x}</li>
                        ))}
                    </ul>
                  </div>
                  <div className="model-box">
                    <h3>Observações importantes</h3>
                    <p>{page.details}</p>
                  </div>
                </div>
              </>,
              i ? " · continuação" : "",
              `equipment-${i}`,
            ),
          );
        }
        if (page.id === "financial")
          return [
            sheet(
              page,
              <>
                <Metrics
                  items={[
                    ["Economia mensal", moneyText(p.estimatedMonthlySavings)],
                    ["Economia anual", moneyText(annual)],
                    ["Payback simples", payback],
                  ]}
                />
                <div className="model-box">
                  <h3>Comparativo mensal estimado</h3>
                  <div className="model-grid">
                    <div>
                      <p>
                        Conta atual <b>{moneyText(p.currentMonthlyBill)}</b>
                      </p>
                      <div className="model-account-bar" />
                      <p>
                        Conta residual estimada{" "}
                        <b>
                          {moneyText(
                            p.currentMonthlyBill != null
                              ? Math.max(
                                  0,
                                  p.currentMonthlyBill -
                                    p.estimatedMonthlySavings,
                                )
                              : undefined,
                          )}
                        </b>
                      </p>
                      <div
                        className="model-account-bar residual"
                        style={{
                          width: p.currentMonthlyBill
                            ? `${Math.max(0, 1 - p.estimatedMonthlySavings / p.currentMonthlyBill) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <div className="model-reduction">
                      REDUÇÃO ESTIMADA
                      <strong>
                        {numberText(
                          p.currentMonthlyBill
                            ? (p.estimatedMonthlySavings /
                                p.currentMonthlyBill) *
                                100
                            : undefined,
                          " %",
                          0,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
                <FinancialChart proposal={p} />
                <Table
                  rows={[
                    [
                      "Sistema fotovoltaico",
                      moneyText(p.totalValue - (maintenance?.annualPrice ?? 0)),
                    ],
                    [
                      "Plano de manutenção — 1º ano",
                      maintenance
                        ? moneyText(maintenance.annualPrice)
                        : "Não contratado",
                    ],
                    ["Investimento total da proposta", moneyText(p.totalValue)],
                  ]}
                />
                <p className="editorial-muted">{page.text}</p>
              </>,
            ),
          ];
        if (page.id === "commercial")
          return [
            sheet(
              page,
              <>
                <div className="model-grid model-conditions">
                  {[
                    [
                      "Pagamento",
                      p.commercialConditions?.paymentMethods ||
                        "Condição comercial não informada.",
                    ],
                    [
                      "Validade",
                      `Proposta emitida em ${dateText(p.createdAt)} e válida até ${dateText(validity)}.`,
                    ],
                    [
                      "Prazo de execução",
                      p.commercialConditions?.deliveryTimeframe ||
                        "Prazo a confirmar conforme disponibilidade, acesso ao imóvel e aprovação técnica.",
                    ],
                    [
                      "Garantias",
                      p.commercialConditions?.warrantyTerms ||
                        "Conforme fabricantes e condições do contrato.",
                    ],
                  ].map(([title, text]) => (
                    <div className="model-box" key={title}>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
                <h3>Premissas e responsabilidades</h3>
                <ul className="model-checks">
                  {page.text
                    .split("\n")
                    .filter(Boolean)
                    .map((x, j) => (
                      <li key={j}>{x}</li>
                    ))}
                </ul>
                {p.commercialConditions?.notes && (
                  <p>{p.commercialConditions.notes}</p>
                )}
                <div className="model-box model-green model-environment">
                  <h3>Indicadores ambientais estimados</h3>
                  <Metrics items={env} />
                  <small>
                    Equivalências ambientais informativas conforme dados
                    registrados na proposta.
                  </small>
                </div>
              </>,
            ),
          ];
        return [
          sheet(
            page,
            <>
              <p>
                {page.text} Código: {p.code}.
              </p>
              <div className="model-box model-acceptance">
                <h3>Resumo para aceite</h3>
                <div className="model-grid">
                  {[
                    ["Cliente", p.clientName],
                    [
                      "Sistema",
                      `${p.systemType} · ${numberText(p.systemPowerKWp, " kWp")}`,
                    ],
                    [
                      "Geração estimada",
                      numberText(p.estimatedMonthlyGenKWh, " kWh/mês"),
                    ],
                    ["Investimento total", moneyText(p.totalValue)],
                    ["Payback simples", payback],
                    ["Manutenção", maintenance?.name ?? "Não contratado"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <small>{label}</small>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <h3>Assinaturas</h3>
              <div className="editorial-signatures">
                <div>
                  Responsável comercial
                  <br />
                  Nome: ______________________
                  <br />
                  Data: ____ / ____ / ______
                </div>
                <div>
                  Cliente / Contratante
                  <br />
                  Nome: ______________________
                  <br />
                  Data: ____ / ____ / ______
                </div>
              </div>
              <div className="model-contact">
                <div>
                  <strong>{ed.companyName}</strong>
                  <p>{ed.footerText}</p>
                </div>
                <div>
                  <p>Contato comercial: {ed.companyPhone || "Não informado"}</p>
                  <p>E-mail: {ed.companyEmail || "Não informado"}</p>
                  <p>{ed.companyAddress}</p>
                </div>
              </div>
            </>,
          ),
        ];
      })}
    </div>
  );
};
