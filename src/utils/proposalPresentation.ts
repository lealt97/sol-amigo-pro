import type {
  PdfSettingsConfig,
  SolarProposal,
  ThemeConfig,
  ProposalIssuer,
} from "../types";
import { normalizeEditorialSettings, numberText } from "./pdfEditorial";
import { normalizeSvgColor } from "./pdfCoverEditor";

export const issuerFromProfile = (user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): ProposalIssuer => {
  const meta = user.user_metadata ?? {};
  const value = (key: string) =>
    typeof meta[key] === "string" ? (meta[key] as string) : "";
  return {
    name: value("full_name"),
    company: value("company"),
    email: user.email ?? "",
    phone: value("phone"),
    companyDocument: value("cnpj"),
  };
};
export function getInternalPagePalette(
  settings: PdfSettingsConfig,
  theme: ThemeConfig,
) {
  const ed = normalizeEditorialSettings(settings.editorial);
  const source = {
    primary: ed.primary,
    secondary: ed.secondary,
    accent: ed.accent,
  };
  const base = settings.useAccountColors
    ? {
        primary: theme.primary,
        secondary: theme.secondary,
        accent: theme.accent,
      }
    : source;
  const replacement = (color: string) =>
    Object.entries(settings.coverColors ?? {}).find(
      ([key]) => normalizeSvgColor(key) === normalizeSvgColor(color),
    )?.[1];
  const resolved = Object.fromEntries(
    Object.entries(base).map(([role, color]) => [
      role,
      ed.useCoverColors
        ? (normalizeSvgColor(replacement(color) ?? color) ?? color)
        : source[role as keyof typeof source],
    ]),
  ) as typeof source;
  const ink = (bg: string) => {
    const hex = normalizeSvgColor(bg) ?? "#0E2337";
    const luminance = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const darkLuminance = 0.015794;
    return (luminance + 0.05) / (darkLuminance + 0.05) >=
      1.05 / (luminance + 0.05)
      ? "#0E2337"
      : "#FFFFFF";
  };
  return {
    ...resolved,
    primaryInk: ink(resolved.primary),
    secondaryInk: ink(resolved.secondary),
  };
}
export function getProposalMaterials(p: SolarProposal) {
  const items = p.pdfData?.equipmentItems ?? p.pricing?.equipmentItems;
  if (items?.length)
    return items.map((x) => ({
      description: x.description,
      category: x.category,
      quantity: numberText(x.quantity, "", 3),
    }));
  const materials = [
    {
      description: p.moduleModel,
      category: "Módulos fotovoltaicos",
      quantity: numberText(p.modulesCount, "", 0),
    },
    {
      description: p.inverterModel,
      category: "Inversor",
      quantity: numberText(
        p.pdfData?.inverterCount ?? p.sizing?.inverterCount,
        "",
        0,
      ),
    },
  ];
  const structure = p.pdfData?.structureType ?? p.sizing?.roofType;
  if (structure)
    materials.push({
      description: structure,
      category: "Estrutura",
      quantity: "Conforme projeto",
    });
  if (p.systemType === "Híbrido" && p.batteryModel)
    materials.push({
      description: p.batteryModel,
      category: "Baterias",
      quantity: numberText(p.batteryCount, "", 0),
    });
  return materials;
}
export function paybackText(years: number) {
  if (!Number.isFinite(years) || years <= 0) return "Não calculado";
  const months = Math.round(years * 12),
    y = Math.floor(months / 12),
    m = months % 12;
  return `${y} ${y === 1 ? "ano" : "anos"}${m ? ` e ${m} ${m === 1 ? "mês" : "meses"}` : ""}`;
}
