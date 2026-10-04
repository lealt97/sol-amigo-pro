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

function BarChart({ proposal }: { proposal: SolarProposal }) {
  const series = getProposalSeries(proposal);
  const max = Math.max(
    1,
    ...series.consumption.filter(Number.isFinite),
    ...series.generation.filter(Number.isFinite),
  );
  return (
    <>
      <svg
        className="editorial-chart"
        viewBox="0 0 500 220"
        role="img"
        aria-label="Consumo e geração em kWh nos doze meses"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="38"
              y1={180 - i * 40}
              x2="498"
              y2={180 - i * 40}
              stroke="#dce5eb"
            />
            <text
              x="33"
              y={184 - i * 40}
              textAnchor="end"
              fontSize="9"
              fill="#587083"
            >
              {Math.round((max * i) / 4)}
            </text>
          </g>
        ))}
        {MONTHS.map((m, i) => (
          <g key={m}>
            <rect
              x={44 + i * 38}
              y={180 - (Math.max(0, series.consumption[i] || 0) / max) * 160}
              width="12"
              height={(Math.max(0, series.consumption[i] || 0) / max) * 160}
              fill="var(--ed-primary)"
              rx="2"
            />
            <rect
              x={58 + i * 38}
              y={180 - (Math.max(0, series.generation[i] || 0) / max) * 160}
              width="12"
              height={(Math.max(0, series.generation[i] || 0) / max) * 160}
              fill="var(--ed-secondary)"
              rx="2"
            />
            <text
              x={57 + i * 38}
              y="200"
              textAnchor="middle"
              fontSize="9"
              fill="#587083"
            >
              {m}
            </text>
          </g>
        ))}
      </svg>
      <p className="editorial-legend">
        <span>● Consumo</span>
        <span>● Geração</span> kWh/mês
      </p>
      {(series.consumptionIsAverage || series.generationIsAverage) && (
        <Note>
          {series.consumptionIsAverage
            ? "Consumo mensal: média repetida nos meses sem histórico. "
            : ""}
          {series.generationIsAverage
            ? "Geração mensal: média repetida, sem simulação de sazonalidade."
            : ""}
        </Note>
      )}
    </>
  );
}

function FinancialChart({ proposal }: { proposal: SolarProposal }) {
  const annual = proposal.estimatedMonthlySavings * 12;
  if (!(annual > 0) || !Number.isFinite(proposal.totalValue))
    return (
      <Note>
        Projeção indisponível: informe investimento e economia estimada.
      </Note>
    );
  const years = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];
  const values = years.map((y) => annual * y - proposal.totalValue);
  const min = Math.min(0, ...values),
    max = Math.max(1, ...values),
    range = max - min;
  const pos = (v: number) => 155 - ((v - min) / range) * 135;
  return (
    <>
      <h3>Fluxo acumulado linear</h3>
      <svg
        className="editorial-chart"
        viewBox="0 0 500 200"
        role="img"
        aria-label="Fluxo acumulado linear em 25 anos"
      >
        <line x1="32" y1={pos(0)} x2="480" y2={pos(0)} stroke="#c8d5df" />
        {years.map((y, i) => (
          <g key={y}>
            <rect
              x={35 + i * 44}
              y={Math.min(pos(0), pos(values[i]))}
              height={Math.max(1, Math.abs(pos(values[i]) - pos(0)))}
              width="25"
              fill={values[i] < 0 ? "var(--ed-primary)" : "var(--ed-secondary)"}
              rx="2"
            />
            <text x={47 + i * 44} y="180" textAnchor="middle" fontSize="10">
              {y}
            </text>
          </g>
        ))}
        <text x="480" y="12" textAnchor="end" fontSize="11">
          {moneyText(values.at(-1))}
        </text>
      </svg>
      <p className="editorial-muted">
        Anos após o investimento • economia constante • valores nominais
      </p>
    </>
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
  let number = includeCover ? 1 : 1;
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
            <span>{page.label}</span>
          </header>
          <div className="editorial-page-heading">
            <span>
              {page.label}
              {continuation}
            </span>
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
              <span>
                {preview
                  ? "PRÉVIA • DADOS DE EXEMPLO"
                  : `PROPOSTA ${p.code} • ${p.clientName}`}
                <br />
                {ed.footerText}
              </span>
              <span>{String(n).padStart(2, "0")}</span>
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
          inner.style.zoom = "1";
          inner.style.width = "100%";
          inner.style.minHeight = "267mm";
          const available = (267 * 96) / 25.4;
          const height = inner.getBoundingClientRect().height;
          if (height > available + 1) {
            const scale = available / height;
            inner.style.zoom = String(scale);
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
        if (page.id === "benefits")
          return [
            sheet(
              page,
              <>
                <div className="editorial-benefits">
                  {page.text
                    .split("\n")
                    .filter(Boolean)
                    .map((line, i) => {
                      const [title, ...text] = line.split("|");
                      return (
                        <section key={i}>
                          <b>{String(i + 1).padStart(2, "0")}</b>
                          <div>
                            <h3>{title}</h3>
                            <p>{text.join("|")}</p>
                          </div>
                        </section>
                      );
                    })}
                </div>
                <h3>Como a energia circula</h3>
                <div className="editorial-flow">
                  {[
                    "Módulos / captam a luz",
                    "Inversor / converte a energia",
                    "Imóvel / consome primeiro",
                    p.systemType === "Híbrido"
                      ? "Baterias e rede / backup e excedentes"
                      : "Rede / recebe excedentes",
                  ].map((v, i) => (
                    <div key={v}>
                      <b>{i + 1}</b>
                      <p>{v}</p>
                    </div>
                  ))}
                </div>
                {settings.showEnvironmental &&
                  (p.co2SavedTonsYear != null ||
                    p.co2AvoidedTons != null ||
                    p.treesEquivalent != null ||
                    p.treesPlanted != null) && <Table rows={env} />}
                <Note>
                  A economia financeira depende das premissas de consumo e da
                  tarifa da proposta.
                </Note>
              </>,
            ),
          ];
        if (page.id === "project")
          return [
            sheet(
              page,
              <>
                <Metrics
                  items={[
                    [
                      "Consumo médio",
                      numberText(p.monthlyConsumptionKWh, " kWh"),
                    ],
                    [
                      "Geração média",
                      numberText(p.estimatedMonthlyGenKWh, " kWh"),
                    ],
                    ["Potência", numberText(p.systemPowerKWp, " kWp")],
                  ]}
                />
                <div className="editorial-highlight">
                  <span>RESULTADO PROJETADO</span>
                  <div>
                    <strong>{moneyText(p.estimatedMonthlySavings)}</strong>
                    <p>economia mensal estimada</p>
                    <strong>{moneyText(annual)}</strong>
                    <p>economia anual estimada</p>
                  </div>
                </div>
                <h3>Premissas principais</h3>
                <Table
                  rows={[
                    ["Cliente", p.clientName],
                    [
                      "Local",
                      [p.clientCity, p.clientState].filter(Boolean).join(" / "),
                    ],
                    [
                      "Tipo de instalação",
                      p.pdfData?.structureType ??
                        p.sizing?.roofType ??
                        "Não informado",
                    ],
                    [
                      "Ligação elétrica",
                      p.pdfData?.connectionType ??
                        p.sizing?.connectionType ??
                        "Não informado",
                    ],
                    [
                      "HSP",
                      numberText(
                        p.hsp ?? p.sizing?.averageCorrectedSunHours,
                        " h/dia",
                      ),
                    ],
                  ]}
                />
                <Note>{page.text}</Note>
              </>,
            ),
          ];
        if (page.id === "generation")
          return [
            sheet(
              page,
              <>
                <BarChart proposal={p} />
                <Metrics
                  items={[
                    [
                      "Geração anual",
                      numberText(
                        p.sizing?.estimatedAnnualGenerationKWh ??
                          p.estimatedMonthlyGenKWh * 12,
                        " kWh",
                      ),
                    ],
                    [
                      "Média mensal",
                      numberText(p.estimatedMonthlyGenKWh, " kWh"),
                    ],
                    [
                      "Área estimada",
                      numberText(
                        p.pdfData?.estimatedAreaM2 ?? p.sizing?.estimatedAreaM2,
                        " m²",
                      ),
                    ],
                  ]}
                />
                <table className="editorial-month-table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Consumo</th>
                      <th>Geração</th>
                      <th>Mês</th>
                      <th>Consumo</th>
                      <th>Geração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.slice(0, 6).map((m, i) => (
                      <tr key={m}>
                        <td>{m}</td>
                        <td>{numberText(series.consumption[i])}</td>
                        <td>{numberText(series.generation[i])}</td>
                        <td>{MONTHS[i + 6]}</td>
                        <td>{numberText(series.consumption[i + 6])}</td>
                        <td>{numberText(series.generation[i + 6])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="editorial-muted">{page.text}</p>
              </>,
            ),
          ];
        if (page.id === "equipment") {
          const equipment =
            p.pdfData?.equipmentItems ?? p.pricing?.equipmentItems;
          const equipmentRows: Row[] = equipment?.length
            ? equipment.map((x) => [
                x.description,
                `${numberText(x.quantity, "", 0)} unidade(s) • ${x.category}`,
              ])
            : [
                [
                  "Módulos fotovoltaicos",
                  `${numberText(p.modulesCount, "", 0)} • ${p.moduleModel}`,
                ],
                ["Inversor", p.inverterModel],
                ["Estrutura", p.pdfData?.structureType ?? "Não informado"],
                ...(p.systemType === "Híbrido"
                  ? [
                      [
                        "Baterias",
                        `${numberText(p.batteryCount, "", 0)} • ${p.batteryModel ?? "Não informado"}`,
                      ] as Row,
                    ]
                  : []),
              ];
          const out = [];
          for (let i = 0; i < equipmentRows.length; i += 10)
            out.push(
              sheet(
                page,
                <>
                  <Table rows={equipmentRows.slice(i, i + 10)} />
                  <Note>{page.text}</Note>
                  {p.maintenancePlan?.enabled && (
                    <>
                      <h3>Plano de manutenção</h3>
                      <p>
                        {p.maintenancePlan.name} •{" "}
                        {numberText(
                          p.maintenancePlan.visitsPerYear,
                          " visitas/ano",
                        )}
                      </p>
                      <p>{p.maintenancePlan.includedServices.join(" • ")}</p>
                    </>
                  )}
                </>,
                i ? " (continuação)" : "",
                `equipment-${i}`,
              ),
            );
          return out;
        }
        if (page.id === "technical") {
          const out = chunks.map((chunk, i) =>
            sheet(
              page,
              <>
                <Table rows={chunk} />
                <Note>{page.text}</Note>
                {i === chunks.length - 1 &&
                  p.sizing?.hybridWarnings?.map((w) => (
                    <p key={w} className="editorial-muted">
                      {w}
                    </p>
                  ))}
              </>,
              i ? " (continuação)" : "",
              `technical-${i}`,
            ),
          );
          const loads = p.pdfData?.loads;
          if (loads?.length)
            for (let i = 0; i < loads.length; i += 10)
              out.push(
                sheet(
                  page,
                  <>
                    <h3>Levantamento de cargas</h3>
                    <table className="editorial-month-table">
                      <thead>
                        <tr>
                          <th>Carga</th>
                          <th>Qtd.</th>
                          <th>W</th>
                          <th>h/dia</th>
                          <th>dias/mês</th>
                          <th>kWh/mês</th>
                          <th>Backup</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loads.slice(i, i + 10).map((l) => (
                          <tr key={l.id}>
                            <td>{l.name}</td>
                            <td>{l.quantity}</td>
                            <td>{l.powerW}</td>
                            <td>{l.hoursPerDay}</td>
                            <td>{l.daysPerMonth}</td>
                            <td>
                              {numberText(
                                (l.powerW *
                                  l.quantity *
                                  l.hoursPerDay *
                                  l.daysPerMonth) /
                                  1000,
                              )}
                            </td>
                            <td>{l.isPriorityBackup ? "Sim" : "Não"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <Note>
                      O consumo mensal usa potência × quantidade × horas/dia ×
                      dias/mês ÷ 1.000. Backup e autonomia exigem análise
                      específica das cargas prioritárias.
                    </Note>
                  </>,
                  " • cargas",
                  `loads-${i}`,
                ),
              );
          if (p.sizing?.monthlySunHours)
            out.push(
              sheet(
                page,
                <>
                  <h3>Irradiação mensal adotada</h3>
                  <Table
                    rows={MONTHS.map(
                      (month, i) =>
                        [
                          month,
                          numberText(p.sizing?.monthlySunHours[i], " h/dia"),
                        ] as Row,
                    )}
                  />
                  <Note>
                    HSP antes do fator de inclinação registrado no memorial. A
                    geração mensal correspondente está na seção Geração
                    estimada.
                  </Note>
                </>,
                " • irradiação",
                "technical-hsp",
              ),
            );
          if (p.sizing?.notes)
            out.push(
              sheet(
                page,
                <Note>{p.sizing.notes}</Note>,
                " • observações",
                "technical-notes",
              ),
            );
          return out;
        }
        if (page.id === "financial")
          return [
            sheet(
              page,
              <>
                <Metrics
                  items={[
                    ["Investimento", moneyText(p.totalValue)],
                    [
                      "Payback simples",
                      p.paybackYears > 0
                        ? numberText(p.paybackYears, " anos")
                        : "Não calculado",
                    ],
                  ]}
                />
                <FinancialChart proposal={p} />
                <Table
                  rows={[
                    [
                      "Economia mensal estimada",
                      moneyText(p.estimatedMonthlySavings),
                    ],
                    ["Economia anual estimada", moneyText(annual)],
                    [
                      "Tarifa adotada",
                      p.pdfData?.energyTariff != null
                        ? `${moneyText(p.pdfData.energyTariff)}/kWh`
                        : "Não informado",
                    ],
                  ]}
                />
                <Note>{page.text}</Note>
              </>,
            ),
          ];
        if (page.id === "commercial")
          return [
            sheet(
              page,
              <>
                <div className="editorial-highlight">
                  <span>VALOR TOTAL DO PROJETO</span>
                  <strong>{moneyText(p.totalValue)}</strong>
                </div>
                <h3>Pagamento</h3>
                <p>
                  {p.commercialConditions?.paymentMethods ||
                    "Condições não informadas. Confirme com seu consultor."}
                </p>
                <h3>Condições e observações</h3>
                <p>{p.commercialConditions?.notes || "Não informadas."}</p>
                {p.pricing && (
                  <Table
                    rows={[
                      ["Valor bruto", moneyText(p.pricing.grossSalePrice)],
                      ["Desconto", moneyText(p.pricing.discountValue)],
                      ["Preço final", moneyText(p.pricing.finalSalePrice)],
                      ["Preço por Wp", moneyText(p.pricing.pricePerWp)],
                    ]}
                  />
                )}
                <Note>{page.text}</Note>
              </>,
            ),
          ];
        if (page.id === "execution")
          return [
            sheet(
              page,
              <>
                <h3>Cronograma de referência</h3>
                <Table
                  rows={page.text
                    .split("\n")
                    .filter(Boolean)
                    .map((line) => {
                      const [label, ...value] = line.split("|");
                      return [label, value.join("|")] as Row;
                    })}
                />
                <h3>Prazo registrado</h3>
                <p>
                  {p.commercialConditions?.deliveryTimeframe ||
                    "Não informado."}
                </p>
                <h3>Garantias e escopo</h3>
                <p>
                  {p.commercialConditions?.warrantyTerms ||
                    "Garantias e escopo devem ser confirmados e registrados antes da contratação."}
                </p>
                <Note>
                  Validade da proposta: {dateText(validity)}. Sujeita à vistoria
                  e confirmação do escopo.
                </Note>
              </>,
            ),
          ];
        return [
          sheet(
            page,
            <>
              <h3>Dados da proposta</h3>
              <Table
                rows={[
                  ["Código", p.code],
                  ["Cliente", p.clientName],
                  ["Documento", p.pdfData?.clientDocument || "Não informado"],
                  ["E-mail", p.clientEmail || "Não informado"],
                  ["Telefone", p.clientPhone || "Não informado"],
                  [
                    "Endereço",
                    p.pdfData?.clientAddress ||
                      [p.clientCity, p.clientState].filter(Boolean).join(" / "),
                  ],
                  [
                    "Emissão / validade",
                    `${dateText(p.createdAt)} / ${dateText(validity)}`,
                  ],
                ]}
              />
              <div className="editorial-signatures">
                <div>Nome / assinatura do cliente</div>
                <div>Data / documento</div>
              </div>
              <h3>Fale com seu consultor</h3>
              <div className="editorial-contact">
                <p>
                  <strong>{ed.companyName}</strong>
                  <br />
                  Documento: {ed.companyDocument || "Não informado"}
                </p>
                <p>
                  {ed.companyPhone || "Telefone não informado"}
                  <br />
                  {ed.companyEmail || "E-mail não informado"}
                </p>
              </div>
              <p className="editorial-muted">
                {ed.companyAddress || "Endereço da empresa não informado"}
              </p>
              <Note>{page.text}</Note>
            </>,
          ),
        ];
      })}
    </div>
  );
};
