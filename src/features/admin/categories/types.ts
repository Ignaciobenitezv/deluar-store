export type AdminCategoryNodeType = "category" | "subcategory";

/**
 * One node of the real 3-level tree the schema allows: category →
 * subcategory → subcategory. `parentId`/`parentType` are only present on
 * subcategory nodes (a root category has neither).
 */
export type AdminCategoryTreeNode = {
  id: string;
  type: AdminCategoryNodeType;
  title: string;
  slug: string;
  description: string;
  order: number | null;
  parentId: string | null;
  parentType: AdminCategoryNodeType | null;
  children: AdminCategoryTreeNode[];
};

export type AdminCategoryField = "title" | "slug" | "description" | "order";
export type AdminSubcategoryField = AdminCategoryField | "parentId";

type ActionStateBase<Field extends string> =
  | { status: "idle" }
  | { status: "success"; message: string; node: AdminCategoryTreeNode }
  | { status: "error"; message: string; fieldErrors?: Partial<Record<Field, string[]>> };

export type AdminCategoryActionState = ActionStateBase<AdminCategoryField>;
export type AdminSubcategoryActionState = ActionStateBase<AdminSubcategoryField>;
