import { defineField, defineType } from "sanity";
import { env } from "@/lib/env";
import { createUniqueSlugValidation } from "../utils/slug";

type ValidationReferenceValue = {
  _ref?: string;
} | null | undefined;

type ValidationDocument = {
  _id?: string;
};

type ValidationClient = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  withConfig?: (config: { perspective?: "drafts" }) => ValidationClient;
};

type ValidationContext = {
  document?: ValidationDocument;
  getClient?: (options: { apiVersion: string }) => ValidationClient;
};

type ParentCategoryResult =
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

const parentCategoryQuery = `
  *[_id == $parentId][0]{
    _id,
    _type,
    "parentType": parentCategory->_type
  }
`;

function getPublishedId(documentId?: string) {
  if (!documentId) {
    return "";
  }

  let currentId = documentId;

  while (true) {
    if (currentId.startsWith("drafts.")) {
      currentId = currentId.slice("drafts.".length);
      continue;
    }

    const versionMatch = currentId.match(/^versions\.[^.]+\./);
    if (versionMatch) {
      currentId = currentId.slice(versionMatch[0].length);
      continue;
    }

    break;
  }

  return currentId;
}

function getHierarchyClient(context: ValidationContext) {
  if (!context.getClient) {
    return null;
  }

  const client = context.getClient({ apiVersion: env.sanityApiVersion });
  return typeof client.withConfig === "function"
    ? client.withConfig({ perspective: "drafts" })
    : client;
}

async function inspectParentCategory(
  value: ValidationReferenceValue,
  context: ValidationContext,
): Promise<ParentCategoryResult> {
  const currentDocumentId = getPublishedId(context.document?._id);
  const selectedParentId = getPublishedId(value?._ref);

  if (!selectedParentId || !currentDocumentId) {
    return { kind: "ok" };
  }

  if (selectedParentId === currentDocumentId) {
    return {
      kind: "integrity",
      message: "Una subcategoría no puede ser padre de sí misma.",
    };
  }

  const client = getHierarchyClient(context);
  if (!client) {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la jerarquía en este momento. Reintentá en unos segundos.",
    };
  }

  try {
    const parent = await client.fetch<
      | {
          _id: string;
          _type: "category" | "subcategory";
          parentType?: "category" | "subcategory";
        }
      | null
    >(parentCategoryQuery, {
      parentId: selectedParentId,
    });

    if (!parent) {
      return {
        kind: "integrity",
        message: "La categoría padre seleccionada ya no existe o no se pudo resolver.",
      };
    }

    if (parent._type === "category") {
      return { kind: "ok" };
    }

    if (parent._type === "subcategory" && parent.parentType === "category") {
      return { kind: "ok" };
    }

    if (parent._type === "subcategory" && parent.parentType === "subcategory") {
      return {
        kind: "integrity",
        message: "Una subcategoría de nivel 2 no puede ser padre de otra subcategoría.",
      };
    }

    return {
      kind: "integrity",
      message: "La categoría padre seleccionada no es válida para esta subcategoría.",
    };
  } catch {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la jerarquía en este momento. Reintentá en unos segundos.",
    };
  }
}

function buildParentCategoryFilter(documentId?: string) {
  const publishedId = getPublishedId(documentId);

  if (!publishedId) {
    return {
      filter:
        '_type == "category" || (_type == "subcategory" && parentCategory->_type == "category")',
    };
  }

  return {
    filter:
      '!(_id in [$publishedId, $draftId]) && (_type == "category" || (_type == "subcategory" && parentCategory->_type == "category"))',
    params: {
      publishedId,
      draftId: `drafts.${publishedId}`,
    },
  };
}

export const subcategorySchema = defineType({
  name: "subcategory",
  title: "Subcategorías",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre",
      description: "Nombre visible dentro de la categoría principal.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description:
        "Se genera automáticamente desde el nombre. Cambialo solo si necesitas corregir la URL.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom(createUniqueSlugValidation("subcategory", "La subcategoría")),
    }),
    defineField({
      name: "parentCategory",
      title: "Categoría principal",
      description:
        "Selecciona una categoría raíz o una subcategoría de nivel 1 como padre.",
      type: "reference",
      to: [{ type: "category" }, { type: "subcategory" }],
      options: {
        filter: ({ document }) => buildParentCategoryFilter(document?._id),
      },
      validation: (rule) => [
        rule.required(),
        rule.custom((value, context) => inspectParentCategory(value, context).then((result) => {
          if (result.kind === "integrity") {
            return result.message;
          }

          return true;
        })),
        rule.custom((value, context) => inspectParentCategory(value, context).then((result) => {
          if (result.kind === "infrastructure") {
            return result.message;
          }

          return true;
        })).warning(),
      ],
    }),
    defineField({
      name: "description",
      title: "Descripción",
      description: "Texto opcional para ampliar el contexto de la subcategoría.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Orden",
      description: "Número opcional para ordenar las subcategorías.",
      type: "number",
      validation: (rule) => rule.integer().min(0),
    }),
  ],
  preview: {
    select: {
      title: "title",
      parentTitle: "parentCategory.title",
    },
    prepare({ title, parentTitle }) {
      return {
        title,
        subtitle: parentTitle ? `Padre: ${parentTitle}` : "Padre sin definir",
      };
    },
  },
});
