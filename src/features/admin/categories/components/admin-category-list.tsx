"use client";

import { useState } from "react";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { AdminCategoryPanel } from "./admin-category-panel";
import { AdminSubcategoryPanel } from "./admin-subcategory-panel";
import type { AdminCategoryTreeNode } from "../types";

type PanelState =
  | { kind: "none" }
  | { kind: "category-create" }
  | { kind: "category-edit"; categoryId: string }
  | { kind: "subcategory-create"; rootCategoryId: string; parentId: string; returnTo: PanelState }
  | { kind: "subcategory-edit"; rootCategoryId: string; subcategoryId: string; returnTo: PanelState };

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

function countDescendants(node: AdminCategoryTreeNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

/** Replaces one node anywhere in the tree by id, keeping every sibling and
 * ancestor untouched — used to splice a just-saved category/subcategory
 * back into local state without refetching the whole tree from the server. */
function replaceNode(nodes: AdminCategoryTreeNode[], updated: AdminCategoryTreeNode): AdminCategoryTreeNode[] {
  let replaced = false;

  const next = nodes.map((node) => {
    if (node.id === updated.id) {
      replaced = true;
      return updated;
    }

    const children = replaceNode(node.children, updated);
    return children === node.children ? node : { ...node, children };
  });

  return replaced ? next : nodes;
}

function insertNode(nodes: AdminCategoryTreeNode[], parentId: string, created: AdminCategoryTreeNode): AdminCategoryTreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...node.children, created] };
    }

    const children = insertNode(node.children, parentId, created);
    return children === node.children ? node : { ...node, children };
  });
}

export function AdminCategoryList({ initialTree }: { initialTree: AdminCategoryTreeNode[] }) {
  const [tree, setTree] = useState(initialTree);
  const [panel, setPanel] = useState<PanelState>({ kind: "none" });

  const handleCategorySaved = (node: AdminCategoryTreeNode) => {
    setTree((current) => {
      const exists = findNodeById(current, node.id);
      return exists ? replaceNode(current, node) : [...current, node];
    });
    setPanel({ kind: "category-edit", categoryId: node.id });
  };

  const handleSubcategorySaved = (node: AdminCategoryTreeNode, returnTo: PanelState) => {
    setTree((current) => {
      const exists = findNodeById(current, node.id);
      if (exists) {
        return replaceNode(current, node);
      }

      return node.parentId ? insertNode(current, node.parentId, node) : current;
    });
    setPanel(returnTo);
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-border bg-surface">
        <div className={cn("flex items-center justify-between gap-3 border-b border-border px-4 py-3.5", dashboardUi.cardHeader)}>
          <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-text-primary">Categorías</h2>
          <button
            type="button"
            onClick={() => setPanel({ kind: "category-create" })}
            className={cn("inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold", dashboardUi.primaryAction)}
          >
            + Nueva categoría
          </button>
        </div>

        {tree.length > 0 ? (
          <div className="divide-y divide-border">
            {tree.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setPanel({ kind: "category-edit", categoryId: category.id })}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-surface-elevated"
              >
                <span className="min-w-0 truncate text-sm font-medium text-text-primary">{category.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-text-secondary">
                  <span className={dashboardUi.labelPill}>
                    {countDescendants(category)} subcategor{countDescendants(category) === 1 ? "ía" : "ías"}
                  </span>
                  <span className="font-semibold text-text-primary">Editar</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-text-secondary">Todavía no hay categorías creadas.</div>
        )}
      </section>

      {panel.kind === "category-create" ? (
        <AdminCategoryPanel
          category={null}
          onClose={() => setPanel({ kind: "none" })}
          onSaved={handleCategorySaved}
          onAddSubcategory={() => {}}
          onEditSubcategory={() => {}}
        />
      ) : null}

      {panel.kind === "category-edit"
        ? (() => {
            const category = findNodeById(tree, panel.categoryId);
            if (!category) {
              return null;
            }

            return (
              <AdminCategoryPanel
                category={category}
                onClose={() => setPanel({ kind: "none" })}
                onSaved={handleCategorySaved}
                onAddSubcategory={(parent) =>
                  setPanel({ kind: "subcategory-create", rootCategoryId: category.id, parentId: parent.id, returnTo: panel })
                }
                onEditSubcategory={(subcategory) =>
                  setPanel({ kind: "subcategory-edit", rootCategoryId: category.id, subcategoryId: subcategory.id, returnTo: panel })
                }
              />
            );
          })()
        : null}

      {panel.kind === "subcategory-create"
        ? (() => {
            const rootCategory = findNodeById(tree, panel.rootCategoryId);
            if (!rootCategory) {
              return null;
            }

            return (
              <AdminSubcategoryPanel
                rootCategory={rootCategory}
                subcategory={null}
                initialParentId={panel.parentId}
                onClose={() => setPanel(panel.returnTo)}
                onSaved={(node) => handleSubcategorySaved(node, panel.returnTo)}
                onAddChildSubcategory={() => {}}
                onEditChildSubcategory={() => {}}
              />
            );
          })()
        : null}

      {panel.kind === "subcategory-edit"
        ? (() => {
            const rootCategory = findNodeById(tree, panel.rootCategoryId);
            const subcategory = findNodeById(tree, panel.subcategoryId);
            if (!rootCategory || !subcategory) {
              return null;
            }

            const currentPanel = panel;

            return (
              <AdminSubcategoryPanel
                rootCategory={rootCategory}
                subcategory={subcategory}
                onClose={() => setPanel(currentPanel.returnTo)}
                onSaved={(node) => handleSubcategorySaved(node, currentPanel.returnTo)}
                onAddChildSubcategory={(parent) =>
                  setPanel({ kind: "subcategory-create", rootCategoryId: rootCategory.id, parentId: parent.id, returnTo: currentPanel })
                }
                onEditChildSubcategory={(child) =>
                  setPanel({ kind: "subcategory-edit", rootCategoryId: rootCategory.id, subcategoryId: child.id, returnTo: currentPanel })
                }
              />
            );
          })()
        : null}
    </div>
  );
}
