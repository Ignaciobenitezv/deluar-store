import type { DerivedTokenName } from "@/features/theme/types";

/** Spanish names of the derived tokens, shared by the admin editor and the Studio schema. */
export const DERIVED_TOKEN_LABELS: Record<DerivedTokenName, string> = {
  canvasAlt: "Fondo alternativo",
  surfaceRaised: "Paneles elevados",
  inkMuted: "Texto secundario",
  line: "Bordes suaves",
  lineStrong: "Bordes de campos",
  ctaHover: "Botón principal (hover)",
  ctaForeground: "Texto del botón principal",
  brandHover: "Marca (hover)",
  brandSoft: "Marca suave",
  brandForeground: "Texto sobre marca",
  brandAlt: "Marca secundaria",
  brandAltForeground: "Texto sobre marca secundaria",
  promoStrong: "Promoción intensa",
  promoSoft: "Promoción suave",
  promoForeground: "Texto sobre promoción",
  accent: "Acento",
  accentSoft: "Acento suave",
  error: "Errores",
  focusRing: "Indicador de foco",
};
