"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/features/admin/auth";
import { logger } from "@/lib/logger";
import { sanityFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { adminProductDetailQuery } from "@/integrations/sanity/admin-queries";
import { getAdminProductsWriteClient } from "../server/admin-products-write-client";
import { normalizeProductDetail } from "../server/admin-product-detail-service";
import {
  hasCompleteAdminProductLogistics,
  parseAdminProductLogisticsFormData,
} from "../validation/product-logistics";
import {
  ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
  buildAdminProductDetailSnapshot,
  serializeAdminProductDetailSnapshot,
} from "../lib/admin-product-detail-snapshot";
import { hasProductVariants } from "../lib/product-commercial";
import type { CatalogHierarchyNode } from "@/features/catalog/hierarchy";
import type { AdminProductDetailActionState, AdminProductDetailField } from "../types";
import {
  adminProductDetailBlocksSchema,
  adminProductDetailDeltaSchema,
  parseAdminProductDetailDescription,
} from "../validation/detail-product";
import type { ProductColorVariantDocument, ProductVariantDocument, SanityImageWithAlt } from "@/types/cms";

type AdminProductDetailDocument = {
  _id: string;
  _rev: string;
  _updatedAt: string;
  title: string;
  slug?: string;
  shortDescription: string;
  description: unknown[];
  basePrice: number;
  transferPrice?: number;
  stock: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isOnOffer?: boolean;
  showInNewIn?: boolean;
  newInOrder?: number;
  logistics?: {
    weightGrams?: number;
    heightCm?: number;
    widthCm?: number;
    depthCm?: number;
  };
  seo?: {
    title?: string;
    description?: string;
  };
  images?: SanityImageWithAlt[];
  category?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  subcategory?: {
    _id: string;
    title?: string;
    slug?: string;
  };
  variants?: Pick<ProductVariantDocument, "_key" | "title" | "value" | "stock" | "isActive">[];
  colorVariants?: Pick<ProductColorVariantDocument, "_key" | "title" | "value" | "stock">[];
};

const DEFAULT_ACTION_STATE: AdminProductDetailActionState = {
  status: "idle",
};

function getDocumentIds(documentId?: string) {
  if (!documentId) {
    return {
      documentId: "",
      draftId: "",
      publishedId: "",
    };
  }

  if (documentId.startsWith("drafts.")) {
    return {
      documentId,
      draftId: documentId,
      publishedId: documentId.replace(/^drafts\./, ""),
    };
  }

  return {
    documentId,
    draftId: `drafts.${documentId}`,
    publishedId: documentId,
  };
}

function extractFieldErrors(error: unknown) {
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return {};
  }

  const issues = (error as { issues?: Array<{ path: Array<string | number>; message: string }> }).issues ?? [];
  const fieldErrors: Partial<Record<AdminProductDetailField, string[]>> = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field !== "string") {
      continue;
    }

    const keys: AdminProductDetailField[] = (() => {
      switch (field) {
        case "subcategory":
          return ["subcategoryId"];
        case "seo":
          return ["seoTitle", "seoDescription"];
        case "descriptionJson":
          return ["description"];
        default:
          return [field as AdminProductDetailField];
      }
    })();

    for (const key of keys) {
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
  }

  return fieldErrors;
}

function buildErrorState(
  message: string,
  fieldErrors?: Partial<Record<AdminProductDetailField, string[]>>,
) {
  return {
    status: "error" as const,
    message,
    fieldErrors,
  };
}

function findNodeById(nodes: CatalogHierarchyNode[], targetId: string): CatalogHierarchyNode | null {
  for (const node of nodes) {
    if (node._id === targetId) {
      return node;
    }

    const childMatch = findNodeById(node.subcategories ?? [], targetId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

function isNodeInTree(nodes: CatalogHierarchyNode[], targetId: string) {
  return Boolean(findNodeById(nodes, targetId));
}

function isDescendantOfCategory(category: CatalogHierarchyNode, targetId: string) {
  return Boolean(findNodeById(category.subcategories ?? [], targetId));
}

function buildRevalidationPaths(args: {
  oldSlug: string;
  newSlug: string;
  oldCategorySlug: string;
  newCategorySlug: string;
  oldSubcategorySlug: string | null;
  newSubcategorySlug: string | null;
  productId: string;
}) {
  const paths = new Set<string>([
    "/admin/productos",
    `/admin/productos/${args.productId}`,
    "/productos",
    "/",
  ]);

  if (args.oldSlug) {
    paths.add(`/productos/detalle/${args.oldSlug}`);
  }

  if (args.newSlug) {
    paths.add(`/productos/detalle/${args.newSlug}`);
  }

  if (args.oldCategorySlug) {
    paths.add(`/productos/${args.oldCategorySlug}`);

    if (args.oldSubcategorySlug) {
      paths.add(`/productos/${args.oldCategorySlug}/${args.oldSubcategorySlug}`);
    }
  }

  if (args.newCategorySlug) {
    paths.add(`/productos/${args.newCategorySlug}`);

    if (args.newSubcategorySlug) {
      paths.add(`/productos/${args.newCategorySlug}/${args.newSubcategorySlug}`);
    }
  }

  return [...paths];
}

function buildPortableTextPayload(rawValue: string) {
  const blocks = parseAdminProductDetailDescription(rawValue);
  return adminProductDetailBlocksSchema.parse(blocks);
}

function describeMutationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      errorName: null,
      errorMessage: String(error),
      statusCode: null,
      errorType: null,
      responseBody: null,
    };
  }

  const candidate = error as {
    name?: string;
    message?: string;
    statusCode?: number;
    code?: number;
    type?: string;
    errorType?: string;
    body?: unknown;
    response?: {
      statusCode?: number;
      body?: unknown;
    };
  };

  const responseBody = candidate.response?.body ?? candidate.body ?? null;
  const responseBodyError =
    responseBody &&
    typeof responseBody === "object" &&
    "error" in responseBody &&
    responseBody.error &&
    typeof responseBody.error === "object"
      ? (responseBody.error as { type?: unknown }).type
      : null;

  return {
    errorName: candidate.name ?? null,
    errorMessage: candidate.message ?? String(error),
    statusCode: candidate.statusCode ?? candidate.code ?? candidate.response?.statusCode ?? null,
    errorType: candidate.errorType
      ? candidate.type
        ? (typeof responseBodyError === "string" ? responseBodyError : null)
        : null
      : null,
    responseBody,
  };
}

export async function updateProductDetailAction(
  previousState: AdminProductDetailActionState = DEFAULT_ACTION_STATE,
  formData: FormData,
): Promise<AdminProductDetailActionState> {
  void previousState;

  await requireAdminSession();

  const productId = String(formData.get("productId") ?? "");
  const rev = String(formData.get("rev") ?? "");
  const deltaJson = String(formData.get("deltaJson") ?? "");

  let deltaPayload: unknown;

  try {
    deltaPayload = JSON.parse(deltaJson);
  } catch {
    return buildErrorState("Revisá los campos marcados.", {
      description: ["No pudimos interpretar los cambios enviados."],
    });
  }

  const parsedDelta = adminProductDetailDeltaSchema.safeParse(deltaPayload);

  if (!parsedDelta.success) {
    return buildErrorState("Revisá los campos marcados.", extractFieldErrors(parsedDelta.error));
  }

  const delta = parsedDelta.data;
  const logisticsResult = parseAdminProductLogisticsFormData(formData);

  if (logisticsResult.status === "error") {
    return buildErrorState("Revisá los campos marcados.", logisticsResult.fieldErrors);
  }

  if (delta.changedFields.length === 0) {
    return buildErrorState("No hay cambios para guardar.");
  }

  const [currentProduct, categoryTree] = await Promise.all([
    sanityFetch<AdminProductDetailDocument | null>(adminProductDetailQuery, { productId }, { useToken: true }),
    sanityFetch<CatalogHierarchyNode[]>(categoryTreeQuery, {}, { useToken: true }),
  ]);

  if (!currentProduct) {
    return buildErrorState("No encontramos el producto para actualizar.", {
      productId: ["No encontramos el producto para actualizar."],
    });
  }

  const currentProductSnapshot = normalizeProductDetail(currentProduct as never);

  logger.debug("admin.products.detail.current_document", {
    productId,
    submittedRev: rev,
    currentRev: currentProduct._rev,
    revMatches: currentProduct._rev === rev,
    stock: currentProduct.stock,
  });

  const hasActiveVariants = hasProductVariants({
    title: currentProduct.title,
    basePrice: currentProduct.basePrice,
    transferPrice: currentProduct.transferPrice,
    stock: currentProduct.stock,
    images: currentProduct.images ?? [],
    variants: currentProduct.variants as ProductVariantDocument[] | undefined,
    colorVariants: currentProduct.colorVariants as ProductColorVariantDocument[] | undefined,
  });

  if (hasActiveVariants && delta.changedFields.includes("stock")) {
    return buildErrorState("El stock está administrado por variantes en este producto.", {
      stock: ["Stock administrado por variantes."],
    });
  }

  if (!hasActiveVariants && delta.changedFields.includes("stock") && typeof delta.stock !== "number") {
    return buildErrorState("El stock es obligatorio para productos simples.", {
      stock: ["Ingresá un stock válido."],
    });
  }

  const nextProductLogistics =
    logisticsResult.status === "set" ? logisticsResult.value : currentProductSnapshot.logistics;

  if (delta.isActive === true && !hasCompleteAdminProductLogistics(nextProductLogistics)) {
    return buildErrorState("CompletÃ¡ peso y dimensiones antes de publicar el producto.", {
      weightGrams: ["CompletÃ¡ peso y dimensiones antes de publicar el producto."],
      heightCm: ["CompletÃ¡ peso y dimensiones antes de publicar el producto."],
      widthCm: ["CompletÃ¡ peso y dimensiones antes de publicar el producto."],
      depthCm: ["CompletÃ¡ peso y dimensiones antes de publicar el producto."],
    });
  }

  const nextCategoryId = delta.categoryId ?? currentProductSnapshot.categoryId;
  const selectedCategory = findNodeById(categoryTree, nextCategoryId);

  if (!selectedCategory) {
    return buildErrorState("La categoría seleccionada no existe.", {
      categoryId: ["La categoría seleccionada no existe."],
    });
  }

  const nextSubcategoryId =
    delta.subcategory?.operation === "set"
      ? delta.subcategory.value.trim()
      : delta.subcategory?.operation === "unset"
        ? ""
        : currentProductSnapshot.subcategoryId ?? "";

  if (delta.subcategory?.operation === "set" && nextSubcategoryId) {
    const subcategoryAllowed =
      isNodeInTree(selectedCategory.subcategories ?? [], nextSubcategoryId) ||
      isDescendantOfCategory(selectedCategory, nextSubcategoryId);

    if (!subcategoryAllowed) {
      return buildErrorState("La subcategoría no pertenece a la categoría elegida.", {
        subcategoryId: ["La subcategoría no pertenece a la categoría elegida."],
      });
    }
  }

  if (delta.changedFields.includes("slug")) {
    const slugCollisionCount = await sanityFetch<number>(
      `count(*[_type == "product" && slug.current == $slug && !(_id in [$documentId, $draftId, $publishedId])])`,
      {
        slug: delta.slug ?? "",
        ...getDocumentIds(productId),
      },
      { useToken: true },
    );

    if (slugCollisionCount > 0) {
      return buildErrorState("Ya existe otro producto con esa URL.", {
        slug: ["Ya existe otro producto con esa URL."],
      });
    }
  }

  logger.debug("admin.products.detail.commit_received", {
    productId,
    submittedRev: rev,
  });

  const mutationId = crypto.randomUUID();
  logger.debug("admin.products.mutation_started", {
    mutationId,
    source: "detail",
    productId,
    submittedRev: rev,
    timestamp: new Date().toISOString(),
  });

  const seoTitle =
    delta.seo?.operation === "set" ? (delta.seo.title?.trim() ?? "") : currentProductSnapshot.seoTitle;
  const seoDescription =
    delta.seo?.operation === "set"
      ? (delta.seo.description?.trim() ?? "")
      : currentProductSnapshot.seoDescription;

  const unsetDecision = {
    subcategoryInput:
      delta.subcategory?.operation === "set"
        ? delta.subcategory.value ?? ""
        : delta.subcategory?.operation === "unset"
          ? ""
          : currentProductSnapshot.subcategoryId ?? "",
    seoTitleInput: delta.seo?.operation === "set" ? delta.seo.title?.trim() ?? "" : currentProductSnapshot.seoTitle ?? "",
    seoDescriptionInput:
      delta.seo?.operation === "set"
        ? delta.seo.description?.trim() ?? ""
        : currentProductSnapshot.seoDescription ?? "",
    unsetSubcategory: delta.subcategory?.operation === "unset",
    unsetSeo: delta.seo?.operation === "unset",
  };

  logger.debug("admin.products.detail.unset_decision", unsetDecision);

  const patchPlan = {
    changedFields: [...delta.changedFields],
    setFields: [] as string[],
    unsetFields: [] as string[],
  };

  if (delta.title !== undefined) {
    patchPlan.setFields.push("title");
  }

  if (delta.slug !== undefined) {
    patchPlan.setFields.push("slug");
  }

  if (delta.shortDescription !== undefined) {
    patchPlan.setFields.push("shortDescription");
  }

  if (delta.changedFields.includes("description")) {
    patchPlan.setFields.push("description");
  }

  if (delta.categoryId !== undefined) {
    patchPlan.setFields.push("category");
  }

  if (delta.basePrice !== undefined) {
    patchPlan.setFields.push("basePrice");
  }

  if (!hasActiveVariants && delta.stock !== undefined) {
    patchPlan.setFields.push("stock");
  }

  if (delta.isActive !== undefined) {
    patchPlan.setFields.push("isActive");
  }

  if (delta.isFeatured !== undefined) {
    patchPlan.setFields.push("isFeatured");
  }

  if (delta.isOnOffer !== undefined) {
    patchPlan.setFields.push("isOnOffer");
  }

  if (delta.showInNewIn !== undefined) {
    patchPlan.setFields.push("showInNewIn");
  }

  if (delta.changedFields.includes("logistics")) {
    patchPlan.setFields.push("logistics");
  }

  if (delta.transferPrice?.operation === "set") {
    patchPlan.setFields.push("transferPrice");
  }

  if (delta.transferPrice?.operation === "unset") {
    patchPlan.unsetFields.push("transferPrice");
  }

  if (delta.subcategory?.operation === "set") {
    patchPlan.setFields.push("subcategory");
  }

  if (delta.subcategory?.operation === "unset") {
    patchPlan.unsetFields.push("subcategory");
  }

  if (delta.newInOrder?.operation === "set") {
    patchPlan.setFields.push("newInOrder");
  }

  if (delta.newInOrder?.operation === "unset") {
    patchPlan.unsetFields.push("newInOrder");
  }

  if (delta.seo?.operation === "set") {
    patchPlan.setFields.push("seo");
  }

  if (delta.seo?.operation === "unset") {
    patchPlan.unsetFields.push("seo");
  }

  logger.debug("admin.products.detail.patch_plan", patchPlan);

  const patchKeys = new Set<string>(patchPlan.setFields);

  for (const field of patchPlan.unsetFields) {
    patchKeys.add(`unset:${field}`);
  }

  logger.debug("admin.products.detail.document_identity", {
    readId: currentProduct._id,
    patchId: currentProduct._id,
    sameDocument: true,
  });

  logger.debug("admin.products.detail.pre_patch", {
    productId,
    documentId: currentProduct._id,
    submittedRev: rev,
    currentRev: currentProduct._rev,
    patchKeys: [...patchKeys],
  });

  let descriptionBlocks: unknown[] | null = null;

  if (delta.changedFields.includes("description")) {
    try {
      descriptionBlocks = buildPortableTextPayload(delta.descriptionJson ?? "");
    } catch {
      return buildErrorState("Revisá los campos marcados.", {
        description: ["La descripción debe tener contenido válido."],
      });
    }
  }

  try {
    const writeClient = getAdminProductsWriteClient();
    const patchSet: Record<string, unknown> = {};

    if (delta.title !== undefined) {
      patchSet.title = delta.title;
    }

    if (delta.slug !== undefined) {
      patchSet.slug = {
        _type: "slug",
        current: delta.slug,
      };
    }

    if (delta.shortDescription !== undefined) {
      patchSet.shortDescription = delta.shortDescription;
    }

    if (descriptionBlocks) {
      patchSet.description = descriptionBlocks;
    }

    if (delta.categoryId !== undefined) {
      patchSet.category = {
        _type: "reference",
        _ref: delta.categoryId,
      };
    }

    if (delta.basePrice !== undefined) {
      patchSet.basePrice = delta.basePrice;
    }

    if (delta.isActive !== undefined) {
      patchSet.isActive = delta.isActive;
    }

    if (delta.isFeatured !== undefined) {
      patchSet.isFeatured = delta.isFeatured;
    }

    if (delta.isOnOffer !== undefined) {
      patchSet.isOnOffer = delta.isOnOffer;
    }

    if (delta.showInNewIn !== undefined) {
      patchSet.showInNewIn = delta.showInNewIn;
    }

    if (delta.changedFields.includes("logistics") && logisticsResult.status === "set") {
      patchSet.logistics = logisticsResult.value;
    }

    if (delta.seo?.operation === "set") {
      patchSet.seo = {
        title: seoTitle || undefined,
        description: seoDescription || undefined,
      };
    }

    let patch = writeClient.patch(currentProduct._id);

    if (Object.keys(patchSet).length > 0) {
      patch = patch.set(patchSet);
    }

    if (!hasActiveVariants && typeof delta.stock === "number") {
      patch = patch.set({ stock: delta.stock });
    }

    if (delta.transferPrice?.operation === "unset") {
      patch = patch.unset(["transferPrice"]);
    } else if (delta.transferPrice?.operation === "set") {
      patch = patch.set({ transferPrice: delta.transferPrice.value });
    }

    if (delta.subcategory?.operation === "set") {
      patch = patch.set({
        subcategory: {
          _type: "reference",
          _ref: delta.subcategory.value,
        },
      });
    } else if (delta.subcategory?.operation === "unset") {
      patch = patch.unset(["subcategory"]);
    }

    if (delta.newInOrder?.operation === "set") {
      patch = patch.set({ newInOrder: delta.newInOrder.value });
    } else if (delta.newInOrder?.operation === "unset") {
      patch = patch.unset(["newInOrder"]);
    }

    if (delta.seo?.operation === "unset") {
      patch = patch.unset(["seo"]);
    }

    if (delta.changedFields.includes("logistics") && logisticsResult.status === "unset") {
      patch = patch.unset(["logistics"]);
    }

    const committedProduct = (await patch.commit({ returnDocuments: true })) as AdminProductDetailDocument;
    const normalizedCommittedProduct = normalizeProductDetail(committedProduct as never);

    logger.debug("admin.products.detail.commit_success", {
      productId,
      oldRev: rev,
      newRev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      stock: committedProduct.stock,
    });

    logger.debug("admin.products.mutation_committed", {
      mutationId,
      source: "detail",
      productId,
      previousRev: rev,
      committedRev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
    });

    const cookieStore = await cookies();
    cookieStore.set(
      ADMIN_PRODUCT_DETAIL_SNAPSHOT_COOKIE,
      serializeAdminProductDetailSnapshot(
        buildAdminProductDetailSnapshot(
          productId,
          committedProduct._rev,
          committedProduct._updatedAt,
          normalizedCommittedProduct.images,
        ),
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/admin/productos",
        maxAge: 120,
      },
    );

    for (const path of buildRevalidationPaths({
      oldSlug: currentProductSnapshot.slug,
      newSlug: normalizedCommittedProduct.slug,
      oldCategorySlug: currentProductSnapshot.categorySlug,
      newCategorySlug: normalizedCommittedProduct.categorySlug,
      oldSubcategorySlug: currentProductSnapshot.subcategorySlug,
      newSubcategorySlug: normalizedCommittedProduct.subcategorySlug,
      productId,
    })) {
      revalidatePath(path);
    }

    return {
      status: "success",
      message: "Cambios guardados correctamente.",
      rev: committedProduct._rev,
      updatedAt: committedProduct._updatedAt,
      product: normalizedCommittedProduct,
    };
  } catch (error) {
    const mutationError = describeMutationError(error);

    logger.debug("admin.products.detail.patch_failed", {
      productId,
      documentId: currentProduct._id,
      submittedRev: rev,
      ...mutationError,
    });

    logger.error("admin.products.detail.failed", {
      productId,
      rev,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      status: "error",
      message: "No pudimos guardar los cambios. Intentalo de nuevo.",
    };
  }
}
