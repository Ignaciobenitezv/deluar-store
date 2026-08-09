import { defineArrayMember, defineField, defineType } from "sanity";
import groq from "groq";
import { env } from "@/lib/env";
import { createUniqueSlugValidation } from "../utils/slug";

type ProductReferenceDocument = {
  category?: { _ref?: string };
};

type ValidationReferenceValue = {
  _ref?: string;
} | null | undefined;

type ValidationDocument = {
  category?: { _ref?: string };
};

type ValidationClient = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  withConfig?: (config: { perspective?: "drafts" }) => ValidationClient;
};

type ValidationContext = {
  document?: unknown;
  getClient?: (options: { apiVersion: string }) => ValidationClient;
};

type ProductSubcategoryValidationResult =
  | {
      kind: "ok";
    }
  | {
      kind: "integrity";
      message: string;
    }
  | {
      kind: "infrastructure";
      message: string;
    };

const productSubcategoryQuery = groq`
  *[_id == $subcategoryId][0]{
    _id,
    _type,
    "parentCategory": parentCategory->{
      _id,
      _type,
      "parentCategory": parentCategory->{
        _id,
        _type
      }
    }
  }
`;

function getHierarchyClient(context: ValidationContext) {
  if (!context.getClient) {
    return null;
  }

  const client = context.getClient({ apiVersion: env.sanityApiVersion });
  return typeof client.withConfig === "function"
    ? client.withConfig({ perspective: "drafts" })
    : client;
}

async function inspectProductSubcategoryCoherence(
  value: ValidationReferenceValue,
  context: ValidationContext,
): Promise<ProductSubcategoryValidationResult> {
  const document = context.document as ValidationDocument | undefined;
  const categoryId = document?.category?._ref;
  const subcategoryId = value?._ref;

  if (!categoryId || !subcategoryId) {
    return { kind: "ok" };
  }

  const client = getHierarchyClient(context);
  if (!client) {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la subcategoria en este momento. Reintentala en unos segundos.",
    };
  }

  try {
    const subcategory = await client.fetch<
      | {
          _id: string;
          _type: "subcategory";
          parentCategory?: {
            _id: string;
            _type: "category" | "subcategory";
            parentCategory?: {
              _id: string;
              _type: "category" | "subcategory";
            };
          };
        }
      | null
    >(productSubcategoryQuery, {
      subcategoryId,
    });

    if (!subcategory) {
      return {
        kind: "integrity",
        message: "La subcategoria seleccionada ya no existe o no se pudo resolver.",
      };
    }

    if (subcategory.parentCategory?._id === categoryId) {
      return { kind: "ok" };
    }

    if (subcategory.parentCategory?.parentCategory?._id === categoryId) {
      return { kind: "ok" };
    }

    return {
      kind: "integrity",
      message: "La subcategoria seleccionada no pertenece a la categoria elegida.",
    };
  } catch {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la subcategoria en este momento. Reintentala en unos segundos.",
    };
  }
}

function formatPreviewPrice(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Sin precio";
  }

  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export const productSchema = defineType({
  name: "product",
  title: "Productos",
  type: "document",
  fieldsets: [
    { name: "general", title: "Informacion general" },
    { name: "prices", title: "Precios" },
    { name: "inventory", title: "Inventario" },
    { name: "images", title: "Imagenes" },
    {
      name: "variants",
      title: "Variantes",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "promotions",
      title: "Promociones",
      options: { collapsible: true, collapsed: true },
    },
    {
      name: "seo",
      title: "SEO",
      options: { collapsible: true, collapsed: true },
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Nombre",
      description: "Nombre comercial visible del producto.",
      placeholder: "Ej: Manta tejida natural",
      type: "string",
      fieldset: "general",
      validation: (rule) => rule.required().min(2).max(160),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description:
        "Se genera automaticamente desde el nombre. Puedes ajustarlo si necesitas corregir la URL.",
      type: "slug",
      fieldset: "general",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom(createUniqueSlugValidation("product", "El producto")),
    }),
    defineField({
      name: "category",
      title: "Categoria",
      description: "Selecciona la categoria principal donde aparecera este producto.",
      type: "reference",
      fieldset: "general",
      to: [{ type: "category" }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subcategory",
      title: "Subcategoria",
      description:
        "Opcional. Solo muestra subcategorias de la categoria elegida, incluyendo nivel 1 y nivel 2.",
      type: "reference",
      fieldset: "general",
      to: [{ type: "subcategory" }],
      options: {
        filter: ({ document }) => {
          const categoryId = (document as ProductReferenceDocument | undefined)?.category?._ref;

          if (!categoryId) {
            return {};
          }

          return {
            filter:
              'parentCategory._ref == $categoryId || parentCategory->parentCategory._ref == $categoryId',
            params: { categoryId },
          };
        },
      },
      validation: (rule) => [
        rule.custom((value, context) =>
          inspectProductSubcategoryCoherence(value, context).then((result) => {
            if (result.kind === "integrity") {
              return result.message;
            }

            return true;
          }),
        ),
        rule.custom((value, context) =>
          inspectProductSubcategoryCoherence(value, context).then((result) => {
            if (result.kind === "infrastructure") {
              return result.message;
            }

            return true;
          }),
        ).warning(),
      ],
    }),
    defineField({
      name: "shortDescription",
      title: "Descripcion corta",
      description: "Resumen breve para cards, listados y destacados. Usa una sola idea clara.",
      placeholder: "Ej: Textil decorativo para living en tono natural.",
      type: "text",
      rows: 3,
      fieldset: "general",
      validation: (rule) => rule.required().min(10).max(240),
    }),
    defineField({
      name: "description",
      title: "Descripcion completa",
      description:
        "Contenido principal del producto. Incluye detalles, materiales, cuidados y cualquier dato util para la compra.",
      type: "array",
      fieldset: "general",
      of: [defineArrayMember({ type: "block" })],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "attributes",
      title: "Caracteristicas",
      description: "Datos opcionales como material, color, medidas o terminacion.",
      type: "array",
      fieldset: "general",
      of: [defineArrayMember({ type: "productAttribute" })],
    }),
    defineField({
      name: "images",
      title: "Imagenes",
      description:
        "Carga una o mas imagenes del producto. La primera se usa como principal en la tienda.",
      type: "array",
      fieldset: "images",
      of: [defineArrayMember({ type: "imageWithAlt" })],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "colorVariants",
      title: "Variantes de color",
      description:
        "Opcional. Si lo completas, la tienda mostrara un selector de color con miniaturas e imagenes propias.",
      type: "array",
      fieldset: "variants",
      of: [defineArrayMember({ type: "productColorVariant" })],
    }),
    defineField({
      name: "basePrice",
      title: "Precio de lista",
      description: "Precio principal que vera el cliente en la tienda.",
      placeholder: "Ej: 100000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: "transferPrice",
      title: "Precio por transferencia",
      description:
        "Opcional. Completa este valor si ofreces un precio especial por transferencia.",
      placeholder: "Ej: 90000",
      type: "number",
      fieldset: "prices",
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: "stock",
      title: "Stock disponible",
      description: "Cantidad disponible para la venta. Usa cero si no hay unidades.",
      placeholder: "Ej: 3",
      type: "number",
      fieldset: "inventory",
      initialValue: 0,
      validation: (rule) => rule.required().integer().min(0),
    }),
    defineField({
      name: "isActive",
      title: "Visible en tienda",
      description: "Si esta desactivado, el producto no se muestra en la tienda.",
      type: "boolean",
      fieldset: "inventory",
      initialValue: true,
    }),
    defineField({
      name: "isFeatured",
      title: "Destacado en home",
      description: "Activalo si quieres usar este producto en secciones destacadas.",
      type: "boolean",
      fieldset: "promotions",
      initialValue: false,
    }),
    defineField({
      name: "isOnOffer",
      title: "Visible en ofertas",
      description:
        "Activalo si quieres que este producto aparezca en el carrusel de ofertas de la portada.",
      type: "boolean",
      fieldset: "promotions",
      initialValue: false,
    }),
    defineField({
      name: "showInNewIn",
      title: "Visible en New In",
      description:
        "Activalo si quieres que este producto aparezca en la seccion New In del home.",
      type: "boolean",
      fieldset: "promotions",
      initialValue: false,
    }),
    defineField({
      name: "newInOrder",
      title: "Prioridad en New In",
      description: "Menor numero = aparece antes en la seccion New In.",
      type: "number",
      fieldset: "promotions",
      hidden: ({ document }) => !document?.showInNewIn,
    }),
    defineField({
      name: "seo",
      title: "SEO del producto",
      description:
        "Opcional. Personaliza como se muestra el producto en buscadores y redes.",
      type: "seo",
      fieldset: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
      basePrice: "basePrice",
      stock: "stock",
      isActive: "isActive",
      media: "images.0.image",
    },
    prepare({ title, basePrice, stock, isActive, media }) {
      const status = isActive === false ? "Inactivo" : "Activo";
      const stockLabel = typeof stock === "number" ? `Stock ${stock}` : "Stock sin definir";

      return {
        title: title || "Producto",
        subtitle: `${status} | ${formatPreviewPrice(basePrice)} | ${stockLabel}`,
        media,
      };
    },
  },
});
