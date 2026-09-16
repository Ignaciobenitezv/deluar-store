"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createSubcategoryAction } from "../actions/create-subcategory-action";
import { updateSubcategoryAction } from "../actions/update-subcategory-action";
import {
  errorClass,
  inputClass,
  labelClass,
  sectionHeadingClass,
  sectionNoteClass,
} from "@/features/admin/products/components/admin-product-tab-content";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { buildAdminProductSlugFromTitle } from "@/features/admin/products/lib/product-slug";
import { cn } from "@/lib/utils";
import type { AdminCategoryTreeNode, AdminSubcategoryActionState, AdminSubcategoryField } from "../types";

const INITIAL_STATE: AdminSubcategoryActionState = { status: "idle" };

function getFieldError(state: AdminSubcategoryActionState, field: AdminSubcategoryField) {
  if (state.status !== "error" || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

type AdminSubcategoryPanelProps = {
  /** The root category — a valid parent is either this category itself or
   * one of its direct (level 1) subcategories; a level 2 subcategory can
   * never be a parent (the schema forbids a 3rd level), so grandchildren
   * never appear as options here. */
  rootCategory: AdminCategoryTreeNode;
  /** `null` = crear subcategoría nueva. */
  subcategory: AdminCategoryTreeNode | null;
  /** Create mode only: which node "+ Nueva subcategoría" was opened from. */
  initialParentId?: string;
  onClose: () => void;
  onSaved: (node: AdminCategoryTreeNode) => void;
  onAddChildSubcategory: (parent: AdminCategoryTreeNode) => void;
  onEditChildSubcategory: (child: AdminCategoryTreeNode) => void;
};

export function AdminSubcategoryPanel({
  rootCategory,
  subcategory,
  initialParentId,
  onClose,
  onSaved,
  onAddChildSubcategory,
  onEditChildSubcategory,
}: AdminSubcategoryPanelProps) {
  const isEdit = subcategory !== null;
  const action = isEdit ? updateSubcategoryAction : createSubcategoryAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const [title, setTitle] = useState(subcategory?.title ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [slug, setSlug] = useState(subcategory?.slug ?? "");
  const [description, setDescription] = useState(subcategory?.description ?? "");
  const [order, setOrder] = useState(subcategory?.order != null ? String(subcategory.order) : "");
  const [parentId, setParentId] = useState(subcategory?.parentId ?? initialParentId ?? rootCategory.id);

  const parentOptions = useMemo(
    () => [
      { id: rootCategory.id, label: rootCategory.title },
      ...rootCategory.children
        .filter((child) => child.id !== subcategory?.id)
        .map((child) => ({ id: child.id, label: `— ${child.title}` })),
    ],
    [rootCategory, subcategory],
  );

  // Puede tener sus propias subcategorías solo si ella misma cuelga
  // directamente de la categoría raíz (nivel 1) — una de nivel 2 no puede
  // ser padre de otra, así que nunca ofrecemos crear un nivel 3.
  const canHaveChildren = isEdit && subcategory.parentType === "category";

  useEffect(() => {
    if (!slugTouched) {
      setSlug(buildAdminProductSlugFromTitle(title));
    }
  }, [slugTouched, title]);

  useEffect(() => {
    if (state.status === "success") {
      onSaved(state.node);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#243247]/45 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>{isEdit ? "Editar subcategoría" : "Nueva subcategoría"}</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text-primary">{title || "Sin nombre"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated"
          >
            Cerrar
          </button>
        </div>

        <form action={formAction} className="grid gap-4 px-5 py-5">
          {isEdit ? <input type="hidden" name="id" value={subcategory.id} /> : null}

          {state.status === "error" && !state.fieldErrors ? (
            <p className={cn("rounded-[18px] border px-4 py-3 text-sm", "border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 text-[color:var(--admin-danger)]")}>
              {state.message}
            </p>
          ) : null}

          <label className={labelClass}>
            <span>Categoría o subcategoría principal</span>
            <select
              name="parentId"
              required
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              className={inputClass}
            >
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {getFieldError(state, "parentId") ? <span className={errorClass}>{getFieldError(state, "parentId")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Nombre</span>
            <input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Ej: Alfombras"
            />
            {getFieldError(state, "title") ? <span className={errorClass}>{getFieldError(state, "title")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Slug</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className={inputClass}
              placeholder="alfombras"
            />
            {getFieldError(state, "slug") ? <span className={errorClass}>{getFieldError(state, "slug")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Descripción (opcional)</span>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={inputClass}
              placeholder="Opcional"
            />
            {getFieldError(state, "description") ? <span className={errorClass}>{getFieldError(state, "description")}</span> : null}
          </label>

          <label className={labelClass}>
            <span>Orden (opcional)</span>
            <input
              type="number"
              name="order"
              min={0}
              step={1}
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              className={cn(inputClass, "max-w-[10rem]")}
              placeholder="Opcional"
            />
            {getFieldError(state, "order") ? <span className={errorClass}>{getFieldError(state, "order")}</span> : null}
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-elevated"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "rounded-full border px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-elevated",
                dashboardUi.primaryAction,
              )}
            >
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear subcategoría"}
            </button>
          </div>
        </form>

        {canHaveChildren ? (
          <div className="border-t border-border px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className={sectionHeadingClass}>Subcategorías</h4>
              <button
                type="button"
                onClick={() => onAddChildSubcategory(subcategory)}
                className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated"
              >
                + Nueva subcategoría
              </button>
            </div>
            <p className={sectionNoteClass}>Nivel 2 — cuelgan de esta subcategoría.</p>

            {subcategory.children.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {subcategory.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => onEditChildSubcategory(child)}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-surface-elevated px-4 py-3 text-left transition hover:bg-surface"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-text-primary">{child.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-text-secondary">Editar</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] border border-dashed border-border bg-surface-elevated px-4 py-5 text-center text-sm text-text-secondary">
                Todavía no tiene subcategorías propias.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
