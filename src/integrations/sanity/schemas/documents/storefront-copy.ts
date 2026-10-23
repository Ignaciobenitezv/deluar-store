import { defineArrayMember, defineField, defineType } from "sanity";
import {
  HERO_SLIDE_FIELDS,
  HERO_SLIDE_TEXT_KEYS,
  HERO_SURFACES,
  PRODUCT_LISTS,
  PRODUCT_LIST_IDS,
  SECTION_IMAGES,
  SECTION_IMAGE_IDS,
  STOREFRONT_COPY_SECTIONS,
  STOREFRONT_COPY_SECTION_IDS,
  sectionFields,
  type CopyFieldDefinition,
} from "@/features/storefront-copy/fields";

// Singleton (fixed _id, see structure.ts) read by the storefront through
// getStorefrontCopy(), published version only. Edited and published only from
// the Deluar admin (Configuración → Textos): read-only here, with no document
// actions (sanity.config.ts). Fields are generated from the same definition
// the admin and the storefront use; only texts that differ from their
// default are stored.

const MANAGED_IN_ADMIN = "Solo lectura: se administra desde el panel de Deluar, en Configuración → Textos.";

const LONG_KINDS = new Set(["multiline", "list", "richtext"]);

const textType = (field: CopyFieldDefinition) => (LONG_KINDS.has(field.kind ?? "text") ? "text" : "string");

/** Hand-set framing of a photo: the point that stays in view (0–1) and a zoom (1–3). */
const framingField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "object",
    fields: [
      defineField({ name: "x", title: "Foco horizontal (0–1)", type: "number" }),
      defineField({ name: "y", title: "Foco vertical (0–1)", type: "number" }),
      defineField({ name: "zoom", title: "Zoom", type: "number" }),
    ],
  });

/** Weak product references: a picked product can still be deleted from Productos. */
const productRefsField = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "array",
    of: [defineArrayMember({ type: "reference", to: [{ type: "product" }], weak: true })],
  });

export const storefrontCopySchema = defineType({
  name: "storefrontCopy",
  title: "Textos de la tienda",
  type: "document",
  readOnly: true,
  description: MANAGED_IN_ADMIN,
  fields: [
    ...STOREFRONT_COPY_SECTION_IDS.map((section) =>
      defineField({
        name: section,
        title: STOREFRONT_COPY_SECTIONS[section].label,
        description: STOREFRONT_COPY_SECTIONS[section].description,
        type: "object",
        options: { collapsible: true, collapsed: true },
        fields: sectionFields(section).map(([name, field]) =>
          defineField({
            name,
            title: field.label,
            description: LONG_KINDS.has(field.kind ?? "text") ? "Vacío: el texto original." : `Vacío: «${field.default}».`,
            type: textType(field),
          }),
        ),
      }),
    ),
    defineField({
      name: "heroSlides",
      title: "Hero: textos corregidos",
      description: "Por diapositiva de la Página de inicio (por su clave); reemplazan los textos cargados allá.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "heroSlideCopy",
          fields: [
            ...HERO_SLIDE_TEXT_KEYS.map((key) =>
              defineField({ name: key, title: HERO_SLIDE_FIELDS[key].label, type: textType(HERO_SLIDE_FIELDS[key]) }),
            ),
            defineField({ name: "image", title: "Foto de reemplazo", type: "image" }),
            defineField({ name: "imageRemoved", title: "Sin foto", type: "boolean" }),
            framingField("imageFraming", "Encuadre de la foto"),
            productRefsField("products", "Productos de la derecha"),
            defineField({
              name: "surface",
              title: "Color del panel",
              type: "string",
              options: { list: Object.entries(HERO_SURFACES).map(([value, title]) => ({ value, title })) },
            }),
            defineField({ name: "custom", title: "Creada en el panel", type: "boolean" }),
          ],
          preview: { select: { title: "title", subtitle: "_key" } },
        }),
      ],
    }),
    defineField({
      name: "images",
      title: "Fotos de fondo",
      description: "Vacía: la foto original de la tienda.",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: SECTION_IMAGE_IDS.map((id) =>
        defineField({
          name: id,
          title: `${STOREFRONT_COPY_SECTIONS[SECTION_IMAGES[id].section].label} · ${SECTION_IMAGES[id].label}`,
          type: "image",
        }),
      ),
    }),
    defineField({
      name: "imageFraming",
      title: "Encuadre de las fotos de fondo",
      description: "Vacío: centrada y sin zoom.",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: SECTION_IMAGE_IDS.map((id) =>
        framingField(id, `${STOREFRONT_COPY_SECTIONS[SECTION_IMAGES[id].section].label} · ${SECTION_IMAGES[id].label}`),
      ),
    }),
    defineField({
      name: "heroSlideOrder",
      title: "Hero: diapositivas y orden",
      description: "Vacío: se muestran las diapositivas de la Página de inicio. Con valores: solo estas, en este orden.",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "productLists",
      title: "Productos elegidos del inicio",
      description: "Vacía, cada lista usa su fuente automática.",
      type: "object",
      options: { collapsible: true, collapsed: true },
      fields: PRODUCT_LIST_IDS.map((list) => productRefsField(list, PRODUCT_LISTS[list].label)),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Textos de la tienda (solo lectura)" }),
  },
});
