import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  PdfInternalPage,
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
} from "../types";
import {
  dateText,
  getVisibleEditorialPages,
  moneyText,
  normalizeEditorialSettings,
  numberText,
} from "../utils/pdfEditorial";
import {
  getInternalPagePalette,
  getProposalMaterials,
  paybackText,
} from "../utils/proposalPresentation";
import {
  getPdfCoverAssetUrl,
  getPdfCoverTemplate,
} from "../data/pdfCoverTemplates";
import { buildCoverSvg } from "../utils/pdfCoverEditor";
import { formatMaintenanceFrequency } from "../utils/maintenance";
import "./proposalEditorial.css";

type Row = [string, string];
const safeImage = (url?: string) =>
  url && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/i.test(url)
    ? url
    : undefined;
const Facts = ({ items }: { items: Row[] }) => (
  <dl className="proposal-facts">
    {items.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value || "Não informado"}</dd>
      </div>
    ))}
  </dl>
);
const Metrics = ({ items }: { items: Row[] }) => (
  <div className="proposal-metrics">
    {items.map(([label, value]) => (
      <div key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    ))}
  </div>
);

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
  const ed = normalizeEditorialSettings(settings.editorial),
    palette = getInternalPagePalette(settings, theme);
  const [coverSvg, setCoverSvg] = useState(""),
    [coverError, setCoverError] = useState(false);
  const cover = getPdfCoverTemplate(settings.template);
  useEffect(() => {
    if (!includeCover) return;
    let active = true;
    setCoverSvg("");
    setCoverError(false);
    fetch(getPdfCoverAssetUrl(cover.file))
      .then((r) => {
        if (!r.ok) throw Error("Capa indisponível");
        return r.text();
      })
      .then((raw) => {
        if (active)
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
        if (active) setCoverError(true);
      });
    return () => {
      active = false;
    };
  }, [includeCover, cover.file, settings]);
  const issuer = p.pdfData?.issuer;
  const company = issuer?.company || ed.companyName;
  const responsible = issuer?.name || ed.representativeName;
  const phone = issuer?.phone || ed.companyPhone,
    email = issuer?.email || ed.companyEmail,
    companyDocument = issuer?.companyDocument || ed.companyDocument;
  const validity =
    p.validUntil ||
    (p.createdAt && !Number.isNaN(Date.parse(p.createdAt))
      ? new Date(
          Date.parse(p.createdAt) + ed.validityDays * 86400000,
        ).toISOString()
      : undefined);
  const materials = getProposalMaterials(p),
    maintenance = p.maintenancePlan?.enabled ? p.maintenancePlan : undefined;
  const style = {
    "--ed-primary": palette.primary,
    "--ed-secondary": palette.secondary,
    "--ed-accent": palette.accent,
    "--ed-primary-ink": palette.primaryInk,
    "--ed-secondary-ink": palette.secondaryInk,
    "--ed-font-size": `${ed.fontSize}pt`,
    fontFamily: `${settings.font}, Arial, sans-serif`,
  } as React.CSSProperties;
  const sheets: {
    page: PdfInternalPage;
    key: string;
    continuation?: boolean;
    content: React.ReactNode;
  }[] = [];
  for (const page of getVisibleEditorialPages(settings).filter(
    (x) => !onlyPageId || x.id === onlyPageId,
  )) {
    if (page.id === "project")
      sheets.push({
        page,
        key: "project",
        content: (
          <>
            <div className="proposal-parties">
              <section>
                <h2>Preparada para</h2>
                <strong>{p.clientName}</strong>
                <p>
                  {p.pdfData?.clientAddress ||
                    [p.clientCity, p.clientState].filter(Boolean).join(" / ") ||
                    "Endereço não informado"}
                </p>
                {p.pdfData?.clientDocument && (
                  <p>CPF/CNPJ: {p.pdfData.clientDocument}</p>
                )}
                <p>
                  {[p.clientPhone, p.clientEmail].filter(Boolean).join(" · ") ||
                    "Contato não informado"}
                </p>
              </section>
              <section>
                <h2>Elaborada por</h2>
                <strong>{company}</strong>
                <p>{responsible || "Responsável não informado"}</p>
                {companyDocument && <p>CNPJ: {companyDocument}</p>}
                <p>
                  {[phone, email].filter(Boolean).join(" · ") ||
                    "Contato não informado"}
                </p>
                {ed.companyAddress && <p>{ed.companyAddress}</p>}
              </section>
            </div>
            <Metrics
              items={[
                ["Potência instalada", numberText(p.systemPowerKWp, " kWp")],
                [
                  "Geração estimada",
                  numberText(p.estimatedMonthlyGenKWh, " kWh/mês", 0),
                ],
                [
                  "Consumo médio",
                  numberText(p.monthlyConsumptionKWh, " kWh/mês", 0),
                ],
              ]}
            />
            <div className="proposal-panel">
              <h2>Resumo da solução</h2>
              <Facts
                items={[
                  ["Sistema", p.systemType || "Não informado"],
                  [
                    "Módulos",
                    `${numberText(p.modulesCount, "", 0)} × ${numberText(p.pdfData?.modulePowerW ?? p.sizing?.modulePowerW, " W", 0)}`,
                  ],
                  ["Distribuidora", p.concessionaria],
                  [
                    "Área estimada",
                    numberText(
                      p.pdfData?.estimatedAreaM2 ?? p.sizing?.estimatedAreaM2,
                      " m²",
                    ),
                  ],
                  ...(p.systemType === "Híbrido"
                    ? ([
                        [
                          "Banco de baterias",
                          numberText(
                            p.batteryCapacityKWh ??
                              p.sizing?.batteryTotalCapacityKWh,
                            " kWh",
                          ),
                        ],
                        [
                          "Autonomia de backup",
                          numberText(p.sizing?.batteryAutonomyHours, " h"),
                        ],
                      ] as Row[])
                    : []),
                ]}
              />
            </div>
            {settings.showFinancial && (
              <div className="proposal-savings">
                <h2>Economia e retorno estimados</h2>
                <Metrics
                  items={[
                    ["Economia mensal", moneyText(p.estimatedMonthlySavings)],
                    [
                      "Economia anual",
                      moneyText(p.estimatedMonthlySavings * 12),
                    ],
                    ["Retorno simples", paybackText(p.paybackYears)],
                  ]}
                />
                {p.currentMonthlyBill != null && (
                  <p>
                    Conta atual: <b>{moneyText(p.currentMonthlyBill)}</b> ·
                    Conta residual estimada:{" "}
                    <b>
                      {moneyText(
                        Math.max(
                          0,
                          p.currentMonthlyBill - p.estimatedMonthlySavings,
                        ),
                      )}
                    </b>
                  </p>
                )}
              </div>
            )}
            <p className="proposal-note">{page.text}</p>
          </>
        ),
      });
    else if (page.id === "equipment") {
      for (let i = 0; i < Math.max(1, Math.ceil(materials.length / 12)); i++)
        sheets.push({
          page,
          key: `equipment-${i}`,
          continuation: i > 0,
          content: (
            <>
              <table className="proposal-materials">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Material / modelo</th>
                    <th>Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.slice(i * 12, (i + 1) * 12).map((x, j) => (
                    <tr key={j}>
                      <td>{i * 12 + j + 1}</td>
                      <td>
                        <strong>{x.category}</strong>
                        <span>{x.description || "Modelo não informado"}</span>
                      </td>
                      <td>{x.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {i === Math.ceil(materials.length / 12) - 1 && (
                <>
                  <div className="proposal-panel">
                    <h2>Serviços incluídos</h2>
                    <ul>
                      {page.text
                        .split("\n")
                        .filter(Boolean)
                        .map((x, j) => (
                          <li key={j}>{x}</li>
                        ))}
                    </ul>
                  </div>
                  {maintenance && (
                    <div className="proposal-panel proposal-maintenance">
                      <h2>Manutenção contratada</h2>
                      <p>
                        <strong>{maintenance.name}</strong> ·{" "}
                        {formatMaintenanceFrequency(maintenance)} ·{" "}
                        {numberText(
                          maintenance.visitsPerYear,
                          " visitas/ano",
                          0,
                        )}
                      </p>
                      <p>{maintenance.includedServices.join(" · ")}</p>
                      <p>
                        Valor anual:{" "}
                        <strong>{moneyText(maintenance.annualPrice)}</strong>
                      </p>
                    </div>
                  )}
                  <p className="proposal-note">{page.details}</p>
                </>
              )}
            </>
          ),
        });
    } else if (page.id === "commercial")
      sheets.push({
        page,
        key: "commercial",
        content: (
          <>
            <div className="proposal-investment">
              <span>INVESTIMENTO TOTAL</span>
              <strong>{moneyText(p.totalValue)}</strong>
              <p>
                {maintenance
                  ? "Inclui o plano de manutenção do primeiro ano."
                  : "Sistema e serviços descritos nesta proposta."}
              </p>
            </div>
            <div className="proposal-conditions">
              <section>
                <h2>Pagamento</h2>
                <p>
                  {p.commercialConditions?.paymentMethods ||
                    "Condições a definir com o responsável comercial."}
                </p>
              </section>
              <section>
                <h2>Execução</h2>
                <p>
                  {p.commercialConditions?.deliveryTimeframe ||
                    "Prazo a confirmar antes da contratação."}
                </p>
              </section>
              <section>
                <h2>Garantias</h2>
                <p>
                  {p.commercialConditions?.warrantyTerms ||
                    "Conforme fabricantes e contrato. Confirmar os prazos antes da contratação."}
                </p>
              </section>
              <section>
                <h2>Validade</h2>
                <p>Até {dateText(validity)}.</p>
              </section>
            </div>
            {p.commercialConditions?.notes && (
              <div className="proposal-panel">
                <h2>Observações comerciais</h2>
                <p>{p.commercialConditions.notes}</p>
              </div>
            )}
            <div className="proposal-accept">
              <h2>Aceite da proposta</h2>
              <p>{page.text}</p>
              <div className="proposal-signatures">
                <div>
                  <span>{responsible || "Responsável comercial"}</span>
                  <small>{company}</small>
                </div>
                <div>
                  <span>{p.clientName}</span>
                  <small>Cliente / Contratante</small>
                </div>
              </div>
              <p className="proposal-sign-date">
                Local e data: __________________________________________
              </p>
            </div>
            <div className="proposal-contact">
              <strong>{company}</strong>
              <span>
                {[phone, email].filter(Boolean).join(" · ") ||
                  "Contato não informado"}
              </span>
              {ed.companyAddress && <span>{ed.companyAddress}</span>}
            </div>
          </>
        ),
      });
  }
  const total = sheets.length + (includeCover ? 1 : 0);
  useLayoutEffect(() => {
    let active = true;
    const fit = () => {
      if (!active) return;
      documentRef.current
        ?.querySelectorAll<HTMLElement>(".editorial-page-inner")
        .forEach((inner) => {
          inner.style.transform = "none";
          inner.style.width = "100%";
          inner.style.minHeight = "267mm";
          const available = (267 * 96) / 25.4,
            height = inner.getBoundingClientRect().height;
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
    images.forEach((x) => x.addEventListener("load", fit));
    return () => {
      active = false;
      images.forEach((x) => x.removeEventListener("load", fit));
    };
  }, [settings, p, includeCover, onlyPageId]);
  return (
    <div
      className="editorial-document concise-proposal"
      ref={documentRef}
      style={style}
    >
      {includeCover && (
        <article className="editorial-sheet editorial-cover" data-page="cover">
          <div
            className="editorial-cover-art"
            dangerouslySetInnerHTML={
              coverSvg ? { __html: coverSvg } : undefined
            }
          >
            {!coverSvg
              ? coverError
                ? "Capa indisponível. Reabra a proposta antes de imprimir."
                : "Carregando capa…"
              : undefined}
          </div>
        </article>
      )}
      {sheets.map(({ page, key, content, continuation }, i) => (
        <article className="editorial-sheet" data-page={page.id} key={key}>
          <div className="editorial-page-inner">
            <div className="proposal-header">
              <div>
                {settings.showLogo && safeImage(settings.customLogoUrl) ? (
                  <img src={safeImage(settings.customLogoUrl)} alt={company} />
                ) : (
                  <strong>{company}</strong>
                )}
                <span>{page.label}</span>
              </div>
              <div>
                <strong>{p.code}</strong>
                <span>Emissão: {dateText(p.createdAt)}</span>
                <span>Validade: {dateText(validity)}</span>
              </div>
            </div>
            <div className="proposal-heading">
              <h1>
                {page.title}
                {continuation ? " · continuação" : ""}
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
            <div className="proposal-content">{content}</div>
            <div className="proposal-footer">
              <span>
                {company}
                {settings.showFooter && ed.footerText
                  ? ` · ${ed.footerText}`
                  : ""}
              </span>
              <span>{preview ? "DADOS DE EXEMPLO" : p.code}</span>
              <span>
                Página {i + 1 + (includeCover ? 1 : 0)} de {total}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};
