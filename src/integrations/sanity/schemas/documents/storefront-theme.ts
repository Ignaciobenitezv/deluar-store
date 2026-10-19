import { defineField, defineType, type StringRule } from "sanity";
import {
  CUSTOM_THEME_PRESET,
  STOREFRONT_THEME_DOCUMENT_ID,
  resolveStorefrontTheme,
} from "@/features/theme/storefront-theme-document";
import { THEME_PRESETS } from "@/features/theme/presets";
import { DERIVED_TOKEN_LABELS } from "@/features/theme/token-labels";
import type { DerivedTokenName, ThemeBaseColors } from "@/features/theme/types";

// Singleton (fixed _id, see structure.ts) read by the storefront through
// getStorefrontTheme(), published version only. Edited and published only from
// the Deluar admin (Configuración → Apariencia): read-only here, with no
// document actions (sanity.config.ts). The storefront re-validates everything
// it reads; the rules below are a defensive second check.

/** Shown in the Studio: this document is managed from the admin panel. */
const MANAGED_IN_ADMIN =
  "Solo lectura: se administra desde el panel de Deluar, en Configuración → Apariencia.";

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const BASE_COLOR_FIELDS: Record<keyof ThemeBaseColors, { title: string; description: string }> = {
  canvas: { title: "Fondo", description: "Fondo general de las páginas." },
  surface: { title: "Superficie", description: "Tarjetas, paneles y cajones." },
  ink: { title: "Texto", description: "Títulos y texto principal." },
  cta: { title: "Botón principal", description: "Agregar al carrito, finalizar compra." },
  brand: { title: "Marca", description: "Barra de anuncios, beneficios y pie de página." },
  promo: { title: "Promoción", description: "Precio promocional y descuentos." },
};

const isCustom = (document: unknown) =>
  (document as { preset?: unknown } | undefined)?.preset === CUSTOM_THEME_PRESET;

const hexRule = (rule: StringRule) =>
  rule.regex(HEX_COLOR, { name: "color hexadecimal" }).error("Usá un color hexadecimal, por ejemplo #465344.");

export const storefrontThemeSchema = defineType({
  name: "storefrontTheme",
  title: "Colores de la tienda",
  type: "document",
  readOnly: true,
  description: MANAGED_IN_ADMIN,
  validation: (rule) =>
    rule.custom((document) => {
      const theme = resolveStorefrontTheme(document);

      return theme.source.kind === "fallback" && theme.source.reason !== "missing"
        ? "La tienda no puede usar esta paleta: hay valores inválidos o incompletos."
        : true;
    }),
  fields: [
    defineField({
      name: "preset",
      title: "Paleta",
      description: `${MANAGED_IN_ADMIN} Una paleta predefinida, o «Personalizada» con los seis colores de abajo.`,
      type: "string",
      initialValue: "deluar-editorial",
      options: {
        layout: "radio",
        list: [
          ...Object.values(THEME_PRESETS).map((preset) => ({ title: preset.label, value: preset.id })),
          { title: "Personalizada", value: CUSTOM_THEME_PRESET },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "colors",
      title: "Colores base",
      description: "Solo se usan con la paleta «Personalizada». Si alguno falta o es inválido, la tienda usa Deluar editorial.",
      type: "object",
      hidden: ({ document }) => !isCustom(document),
      fields: (Object.entries(BASE_COLOR_FIELDS) as [keyof ThemeBaseColors, { title: string; description: string }][]).map(
        ([name, { title, description }]) =>
          defineField({
            name,
            title,
            description,
            type: "string",
            validation: (rule) =>
              hexRule(rule).custom((value, context) =>
                isCustom(context.document) && !value ? "Obligatorio con la paleta «Personalizada»." : true,
              ),
          }),
      ),
    }),
    defineField({
      name: "overrides",
      title: "Ajustes avanzados",
      description: "Opcional. Fija un tono calculado. Solo se usan con la paleta «Personalizada».",
      type: "object",
      hidden: ({ document }) => !isCustom(document),
      options: { collapsible: true, collapsed: true },
      fields: (Object.entries(DERIVED_TOKEN_LABELS) as [DerivedTokenName, string][]).map(([name, title]) =>
        defineField({ name, title, type: "string", validation: hexRule }),
      ),
    }),
  ],
  preview: {
    select: { preset: "preset" },
    prepare: ({ preset }: { preset?: string }) => ({
      title: "Colores de la tienda (solo lectura)",
      subtitle:
        preset === CUSTOM_THEME_PRESET
          ? "Personalizada"
          : (THEME_PRESETS[preset as keyof typeof THEME_PRESETS]?.label ?? STOREFRONT_THEME_DOCUMENT_ID),
    }),
  },
});
