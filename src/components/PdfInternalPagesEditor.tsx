import React, { useRef, useState } from "react";
import type {
  PdfEditorialSettings,
  PdfInternalPage,
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
} from "../types";
import {
  EDITORIAL_PREVIEW_PROPOSAL,
  cloneEditorialSettings,
} from "../utils/pdfEditorial";
import { ProposalEditorialDocument } from "./ProposalEditorialDocument";
import { uploadPdfCoverPhoto } from "../services/pdfCustomization";

export const PdfInternalPagesEditor: React.FC<{
  settings: PdfSettingsConfig;
  theme: ThemeConfig;
  onChange: (settings: PdfSettingsConfig) => void;
  onSave: () => void;
  onDiscard: () => void;
}> = ({ settings, theme, onChange, onSave, onDiscard }) => {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [pageId, setPageId] = useState("benefits");
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [example, setExample] = useState<SolarProposal>(
    EDITORIAL_PREVIEW_PROPOSAL,
  );
  const ed = cloneEditorialSettings(settings.editorial);
  const page = ed.pages.find((p) => p.id === pageId) ?? ed.pages[0];
  const update = (patch: Partial<PdfEditorialSettings>) =>
    onChange({ ...settings, editorial: { ...ed, ...patch } });
  const updatePage = (patch: Partial<PdfInternalPage>) =>
    update({
      pages: ed.pages.map((p) => (p.id === page.id ? { ...p, ...patch } : p)),
    });
  const move = (offset: number) => {
    const pages = ed.pages.map((p) => ({ ...p }));
    const index = pages.findIndex((p) => p.id === page.id),
      target = index + offset;
    if (target < 0 || target >= pages.length) return;
    [pages[index], pages[target]] = [pages[target], pages[index]];
    update({ pages });
  };
  const fieldStyle = {
    background: theme.background,
    borderColor: theme.border,
    color: theme.text,
  };
  const input = (
    label: string,
    value: string,
    change: (value: string) => void,
    max = 160,
  ) => (
    <label className="block text-xs font-bold">
      {label}
      <input
        className="mt-2 w-full rounded-lg border p-2 font-normal"
        style={fieldStyle}
        value={value}
        maxLength={max}
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Páginas internas da proposta</h2>
          <p className="mt-1 text-sm opacity-65">
            Cinco páginas internas do modelo enviado. Tabelas extensas criam
            folhas de continuação para preservar os dados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border px-4 py-2 text-xs font-bold"
            style={{ borderColor: theme.border }}
            onClick={onDiscard}
          >
            Descartar
          </button>
          <button
            className="rounded-lg px-4 py-2 text-xs font-bold text-white"
            style={{ background: theme.secondary }}
            onClick={onSave}
          >
            Salvar páginas
          </button>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div
          className="space-y-5 rounded-xl border p-4"
          style={{ background: theme.primary, borderColor: theme.border }}
        >
          <label
            htmlFor="editorial-page-select"
            className="block text-xs font-bold"
          >
            Página
          </label>
          <select
            id="editorial-page-select"
            className="mt-2 w-full rounded-lg border p-2"
            style={fieldStyle}
            value={page.id}
            onChange={(e) => setPageId(e.target.value)}
          >
            {ed.pages.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i + 2}. {p.label}
                {p.enabled ? "" : " (oculta)"}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label>
              <input
                type="checkbox"
                checked={page.enabled}
                onChange={(e) => updatePage({ enabled: e.target.checked })}
              />{" "}
              Incluir na proposta
            </label>
            <button
              aria-label="Mover página para cima"
              disabled={ed.pages[0].id === page.id}
              onClick={() => move(-1)}
            >
              ↑ Mover
            </button>
            <button
              aria-label="Mover página para baixo"
              disabled={ed.pages.at(-1)?.id === page.id}
              onClick={() => move(1)}
            >
              ↓ Mover
            </button>
          </div>
          {input(
            "Nome da seção",
            page.label,
            (label) => updatePage({ label }),
            70,
          )}
          {input("Título", page.title, (title) => updatePage({ title }), 140)}
          <label className="block text-xs font-bold">
            Introdução
            <textarea
              className="mt-2 w-full rounded-lg border p-2 font-normal"
              style={fieldStyle}
              rows={3}
              maxLength={420}
              value={page.intro}
              onChange={(e) => updatePage({ intro: e.target.value })}
            />
          </label>
          <label className="block text-xs font-bold">
            Texto da página
            {["benefits", "execution"].includes(page.id) && (
              <span className="mt-1 block text-[10px] opacity-60">
                Uma linha por item, no formato título | descrição.
              </span>
            )}
            <textarea
              className="mt-2 w-full rounded-lg border p-2 font-normal"
              style={fieldStyle}
              rows={6}
              maxLength={1000}
              value={page.text}
              onChange={(e) => updatePage({ text: e.target.value })}
            />
          </label>
          {page.id === "equipment" && (
            <label className="block text-xs font-bold">
              Observações importantes
              <textarea
                className="mt-2 w-full rounded-lg border p-2 font-normal"
                style={fieldStyle}
                rows={4}
                maxLength={1000}
                value={page.details ?? ""}
                onChange={(e) => updatePage({ details: e.target.value })}
              />
            </label>
          )}
          <label className="block text-xs font-bold">
            Imagem da página (PNG, JPG ou WebP)
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              className="mt-2 block w-full text-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const selectedId = page.id;
                setUploading(true);
                setUploadError("");
                try {
                  const imageUrl = await uploadPdfCoverPhoto(file);
                  const latest = settingsRef.current;
                  const latestEditorial = cloneEditorialSettings(
                    latest.editorial,
                  );
                  onChange({
                    ...latest,
                    editorial: {
                      ...latestEditorial,
                      pages: latestEditorial.pages.map((p) =>
                        p.id === selectedId ? { ...p, imageUrl } : p,
                      ),
                    },
                  });
                } catch (error) {
                  setUploadError(
                    error instanceof Error
                      ? error.message
                      : "Falha ao enviar imagem",
                  );
                } finally {
                  setUploading(false);
                }
              }}
            />
          </label>
          {uploading && <p className="text-xs">Enviando imagem…</p>}
          {uploadError && (
            <p role="alert" className="text-xs text-red-400">
              {uploadError}
            </p>
          )}
          {page.imageUrl && (
            <button
              className="text-xs underline"
              onClick={() => updatePage({ imageUrl: undefined })}
            >
              Remover imagem
            </button>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-black">
              Cores e tipografia das páginas
            </summary>
            <div className="mt-4 space-y-3">
              {(["primary", "secondary", "accent"] as const).map((key, i) => (
                <label
                  className="flex items-center justify-between text-xs"
                  key={key}
                >
                  {["Texto e blocos", "Destaques e gráfico", "Detalhes"][i]}
                  <input
                    type="color"
                    value={ed[key]}
                    onChange={(e) => update({ [key]: e.target.value })}
                  />
                </label>
              ))}
              <label className="flex justify-between text-xs">
                Tamanho do texto
                <input
                  type="number"
                  min="9"
                  max="13"
                  value={ed.fontSize}
                  style={fieldStyle}
                  className="w-16 rounded border px-2"
                  onChange={(e) => update({ fontSize: Number(e.target.value) })}
                />
              </label>
              <label className="flex justify-between text-xs">
                Fonte
                <select
                  value={settings.font}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      font: e.target.value as PdfSettingsConfig["font"],
                    })
                  }
                  style={fieldStyle}
                >
                  {["Inter", "Manrope", "Montserrat", "Lato"].map((font) => (
                    <option key={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <input
                  type="checkbox"
                  checked={settings.showFooter}
                  onChange={(e) =>
                    onChange({ ...settings, showFooter: e.target.checked })
                  }
                />{" "}
                Exibir rodapé
              </label>
              <label className="block text-xs">
                <input
                  type="checkbox"
                  checked={settings.showFinancial}
                  onChange={(e) =>
                    onChange({ ...settings, showFinancial: e.target.checked })
                  }
                />{" "}
                Exibir análise financeira
              </label>
              <label className="block text-xs">
                <input
                  type="checkbox"
                  checked={settings.showEquipment}
                  onChange={(e) =>
                    onChange({ ...settings, showEquipment: e.target.checked })
                  }
                />{" "}
                Exibir equipamentos
              </label>
            </div>
          </details>
          <details>
            <summary className="cursor-pointer text-sm font-black">
              Empresa, rodapé e validade
            </summary>
            <div className="mt-4 space-y-3">
              {input("Empresa", ed.companyName, (companyName) =>
                update({ companyName }),
              )}
              {input("E-mail", ed.companyEmail, (companyEmail) =>
                update({ companyEmail }),
              )}
              {input("Telefone", ed.companyPhone, (companyPhone) =>
                update({ companyPhone }),
              )}
              {input(
                "Documento / CNPJ",
                ed.companyDocument,
                (companyDocument) => update({ companyDocument }),
              )}
              {input(
                "Endereço",
                ed.companyAddress,
                (companyAddress) => update({ companyAddress }),
                240,
              )}
              {input("Rodapé", ed.footerText, (footerText) =>
                update({ footerText }),
              )}
              <label className="flex justify-between text-xs">
                Validade padrão (dias)
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={ed.validityDays}
                  style={fieldStyle}
                  className="w-16 rounded border px-2"
                  onChange={(e) =>
                    update({ validityDays: Number(e.target.value) })
                  }
                />
              </label>
            </div>
          </details>
          <p className="text-xs opacity-60">
            Valores técnicos e financeiros vêm da proposta. Edite consumo,
            dimensionamento e preço no assistente para manter os dados
            consistentes.
          </p>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <strong>Prévia com dados de exemplo</strong>
            <select
              className="rounded-lg border p-2"
              style={fieldStyle}
              value={example.systemType}
              onChange={(e) =>
                setExample({
                  ...EDITORIAL_PREVIEW_PROPOSAL,
                  systemType: e.target.value as "On-Grid" | "Híbrido",
                  ...(e.target.value === "Híbrido"
                    ? {
                        batteryModel: "Bateria de exemplo 5,12 kWh",
                        batteryCount: 2,
                        batteryCapacityKWh: 10.24,
                        pdfData: {
                          ...EDITORIAL_PREVIEW_PROPOSAL.pdfData,
                          backupAutonomyHours: 4,
                        },
                      }
                    : {}),
                })
              }
            >
              <option>On-Grid</option>
              <option>Híbrido</option>
            </select>
          </div>
          <div className="editorial-preview-scroll">
            <ProposalEditorialDocument
              proposal={example}
              settings={{
                ...settings,
                showFinancial: true,
                showEquipment: true,
                editorial: {
                  ...ed,
                  pages: ed.pages.map((p) => ({ ...p, enabled: true })),
                },
              }}
              theme={theme}
              includeCover={false}
              onlyPageId={page.id}
              preview
            />
          </div>
          <p className="text-xs opacity-60">
            A prévia mostra a seção mesmo quando oculta. Na proposta, a seleção
            de páginas e os dados salvos são respeitados.
          </p>
        </div>
      </div>
    </section>
  );
};
