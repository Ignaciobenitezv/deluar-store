import "server-only";

import groq from "groq";
import { revalidatePath } from "next/cache";
import { sanityFreshFetch } from "@/integrations/sanity/client";
import { categoryTreeQuery } from "@/integrations/sanity/queries";
import { getAdminProductsWriteClient } from "@/features/admin/products/server/admin-products-write-client";
import type { AdminCategoryFormValues, AdminSubcategoryFormValues } from "../validation/category";
import type { AdminCategoryNodeType, AdminCategoryTreeNode } from "../types";

export class AdminCategorySlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`Ya existe una categoría o subcategoría con la URL "${slug}".`);
    this.name = "AdminCategorySlugTakenError";
  }
}

export class AdminCategoryParentInvalidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminCategoryParentInvalidError";
  }
}

export class AdminCategoryNotFoundError extends Error {
  constructor(message = "No encontramos la categoría o subcategoría.") {
    super(message);
    this.name = "AdminCategoryNotFoundError";
  }
}

type RawTreeNode = {
  _id: string;
  _type: AdminCategoryNodeType;
  title: string;
  slug?: { current?: string } | string;
  description?: string;
  order?: number;
  subcategories?: RawTreeNode[];
};

function resolveSlug(slug: RawTreeNode["slug"]) {
  if (typeof slug === "string") {
    return slug;
  }

  return slug?.current ?? "";
}

function normalizeNode(
  node: RawTreeNode,
  parentId: string | null,
  parentType: AdminCategoryNodeType | null,
): AdminCategoryTreeNode {
  return {
    id: node._id,
    type: node._type,
    title: node.title,
    slug: resolveSlug(node.slug),
    description: node.description?.trim() ?? "",
    order: typeof node.order === "number" ? node.order : null,
    parentId,
    parentType,
    children: (node.subcategories ?? []).map((child) => normalizeNode(child, node._id, node._type)),
  };
}

/** The real 3-level tree (category → subcategory → subcategory) the schema
 * allows — `categoryTreeQuery` already builds it two levels deep under each
 * root, reused as-is from the query that already powers the Categoría /
 * Subcategoría selects in Crear/Editar producto. */
export async function getAdminCategoryTree(): Promise<AdminCategoryTreeNode[]> {
  const raw = await sanityFreshFetch<RawTreeNode[]>(categoryTreeQuery, {});
  return raw.map((node) => normalizeNode(node, null, null));
}

function findNodeById(nodes: AdminCategoryTreeNode[], id: string): AdminCategoryTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }

  return null;
}

export async function getAdminCategoryNode(id: string): Promise<AdminCategoryTreeNode | null> {
  const tree = await getAdminCategoryTree();
  return findNodeById(tree, id);
}

/** Mirrors Studio's own uniqueness rule (`createUniqueSlugValidation` in
 * schemas/utils/slug.ts): scoped to the same `_type` only — a category and a
 * subcategory may share a slug value, matching what Studio already allows. */
async function isSlugTaken(type: AdminCategoryNodeType, slug: string, excludeId: string) {
  return sanityFreshFetch<boolean>(
    groq`count(*[_type == $type && slug.current == $slug && _id != $excludeId]) > 0`,
    { type, slug, excludeId },
  );
}

/** Same rule the `subcategory` schema's own `parentCategory` validation
 * enforces in Studio (schemas/documents/subcategory.ts) — reproduced here
 * because Sanity API writes bypass Studio's custom field validation
 * entirely, so nothing stops an invalid parent from being written unless
 * this action checks it itself. */
async function assertValidParent(parentId: string, selfId: string | null) {
  if (parentId === selfId) {
    throw new AdminCategoryParentInvalidError("Una subcategoría no puede ser padre de sí misma.");
  }

  const parent = await sanityFreshFetch<{ _id: string; _type: AdminCategoryNodeType; parentType?: AdminCategoryNodeType } | null>(
    groq`*[_id == $parentId][0]{ _id, _type, "parentType": parentCategory->_type }`,
    { parentId },
  );

  if (!parent) {
    throw new AdminCategoryNotFoundError("La categoría o subcategoría padre seleccionada ya no existe.");
  }

  if (parent._type === "category") {
    return;
  }

  if (parent._type === "subcategory" && parent.parentType === "category") {
    return;
  }

  throw new AdminCategoryParentInvalidError("Una subcategoría de nivel 2 no puede ser padre de otra subcategoría.");
}

function revalidateCategoryPaths() {
  revalidatePath("/admin/productos/categorias");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/productos/nuevo");
  revalidatePath("/productos");
}

export async function createAdminCategory(values: AdminCategoryFormValues): Promise<AdminCategoryTreeNode> {
  if (await isSlugTaken("category", values.slug, "")) {
    throw new AdminCategorySlugTakenError(values.slug);
  }

  const writeClient = getAdminProductsWriteClient();
  const created = await writeClient.create({
    _type: "category",
    title: values.title,
    slug: { _type: "slug", current: values.slug },
    ...(values.description ? { description: values.description } : {}),
    ...(typeof values.order === "number" ? { order: values.order } : {}),
  });

  revalidateCategoryPaths();

  return normalizeNode({ ...created, _type: "category" } as RawTreeNode, null, null);
}

export async function updateAdminCategory(id: string, values: AdminCategoryFormValues): Promise<AdminCategoryTreeNode> {
  if (await isSlugTaken("category", values.slug, id)) {
    throw new AdminCategorySlugTakenError(values.slug);
  }

  const writeClient = getAdminProductsWriteClient();
  let patch = writeClient.patch(id).set({
    title: values.title,
    slug: { _type: "slug", current: values.slug },
  });

  patch = values.description ? patch.set({ description: values.description }) : patch.unset(["description"]);
  patch = typeof values.order === "number" ? patch.set({ order: values.order }) : patch.unset(["order"]);

  await patch.commit();
  revalidateCategoryPaths();

  const node = await getAdminCategoryNode(id);
  if (!node) {
    throw new AdminCategoryNotFoundError();
  }

  return node;
}

export async function createAdminSubcategory(values: AdminSubcategoryFormValues): Promise<AdminCategoryTreeNode> {
  await assertValidParent(values.parentId, null);

  if (await isSlugTaken("subcategory", values.slug, "")) {
    throw new AdminCategorySlugTakenError(values.slug);
  }

  const writeClient = getAdminProductsWriteClient();
  const created = await writeClient.create({
    _type: "subcategory",
    title: values.title,
    slug: { _type: "slug", current: values.slug },
    parentCategory: { _type: "reference", _ref: values.parentId },
    ...(values.description ? { description: values.description } : {}),
    ...(typeof values.order === "number" ? { order: values.order } : {}),
  });

  revalidateCategoryPaths();

  const node = await getAdminCategoryNode(created._id);

  if (!node) {
    throw new AdminCategoryNotFoundError("La subcategoría se creó pero no pudimos leerla de vuelta.");
  }

  return node;
}

export async function updateAdminSubcategory(id: string, values: AdminSubcategoryFormValues): Promise<AdminCategoryTreeNode> {
  await assertValidParent(values.parentId, id);

  if (await isSlugTaken("subcategory", values.slug, id)) {
    throw new AdminCategorySlugTakenError(values.slug);
  }

  const writeClient = getAdminProductsWriteClient();
  let patch = writeClient.patch(id).set({
    title: values.title,
    slug: { _type: "slug", current: values.slug },
    parentCategory: { _type: "reference", _ref: values.parentId },
  });

  patch = values.description ? patch.set({ description: values.description }) : patch.unset(["description"]);
  patch = typeof values.order === "number" ? patch.set({ order: values.order }) : patch.unset(["order"]);

  await patch.commit();
  revalidateCategoryPaths();

  const node = await getAdminCategoryNode(id);
  if (!node) {
    throw new AdminCategoryNotFoundError();
  }

  return node;
}
