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
      message: "Una subcategoria no puede ser padre de si misma.",
    };
  }

  const client = getHierarchyClient(context);
  if (!client) {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la jerarquia en este momento. Reintentala en unos segundos.",
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
        message: "El padre seleccionado ya no existe o no se pudo resolver.",
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
        message: "Una subcategoria de nivel 2 no puede ser padre de otra subcategoria.",
      };
    }

    return {
      kind: "integrity",
      message: "El padre seleccionado no es valido para esta subcategoria.",
    };
  } catch {
    return {
      kind: "infrastructure",
      message: "No se pudo validar la jerarquia en este momento. Reintentala en unos segundos.",
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
  title: "Subcategorias",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Nombre",
      description: "Nombre visible dentro de la categoria principal.",
      type: "string",
      validation: (rule) => rule.required().min(2).max(120),
    }),
    defineField({
      name: "slug",
      title: "URL",
      description:
        "Se genera automaticamente desde el nombre. Cambialo solo si necesitas corregir la URL.",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required().custom(createUniqueSlugValidation("subcategory", "La subcategoria")),
    }),
    defineField({
      name: "parentCategory",
      title: "Categoria principal",
      description:
        "Selecciona una categoria raiz o una subcategoria de nivel 1 como padre.",
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
      title: "Descripcion",
      description: "Texto opcional para ampliar el contexto de la subcategoria.",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "order",
      title: "Orden",
      description: "Numero opcional para ordenar las subcategorias.",
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
