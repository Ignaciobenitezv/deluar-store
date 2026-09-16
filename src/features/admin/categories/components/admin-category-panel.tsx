"use client";

import { useActionState, useEffect, useState } from "react";
import { createCategoryAction } from "../actions/create-category-action";
import { updateCategoryAction } from "../actions/update-category-action";
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
import type { AdminCategoryActionState, AdminCategoryField, AdminCategoryTreeNode } from "../types";

const INITIAL_STATE: AdminCategoryActionState = { status: "idle" };

function getFieldError(state: AdminCategoryActionState, field: AdminCategoryField) {
  if (state.status !== "error" || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

type AdminCategoryPanelProps = {
  /** `null` = crear categoría nueva. */
  category: AdminCategoryTreeNode | null;
  onClose: () => void;
  onSaved: (node: AdminCategoryTreeNode) => void;
  onAddSubcategory: (parent: AdminCategoryTreeNode) => void;
  onEditSubcategory: (subcategory: AdminCategoryTreeNode) => void;
};

export function AdminCategoryPanel({ category, onClose, onSaved, onAddSubcategory, onEditSubcategory }: AdminCategoryPanelProps) {
  const isEdit = category !== null;
  const action = isEdit ? updateCategoryAction : createCategoryAction;
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  const [title, setTitle] = useState(category?.title ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [order, setOrder] = useState(category?.order != null ? String(category.order) : "");

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#243247]/45 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-border bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div className="min-w-0">
            <p className={dashboardUi.mutedLabel}>{isEdit ? "Editar categoría" : "Nueva categoría"}</p>
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
          {isEdit ? <input type="hidden" name="id" value={category.id} /> : null}

          {state.status === "error" && !state.fieldErrors ? (
            <p className={cn("rounded-[18px] border px-4 py-3 text-sm", "border-[var(--admin-danger)]/25 bg-[var(--admin-danger)]/10 text-[color:var(--admin-danger)]")}>
              {state.message}
            </p>
          ) : null}

          <label className={labelClass}>
            <span>Nombre</span>
            <input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClass}
              placeholder="Ej: Living"
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
              placeholder="living"
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
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear categoría"}
            </button>
          </div>
        </form>

        {isEdit ? (
          <div className="border-t border-border px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className={sectionHeadingClass}>Subcategorías</h4>
              <button
                type="button"
                onClick={() => onAddSubcategory(category)}
                className="rounded-full border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-elevated"
              >
                + Nueva subcategoría
              </button>
            </div>
            <p className={sectionNoteClass}>Categoría y subcategorías se administran juntas.</p>

            {category.children.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {category.children.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onClick={() => onEditSubcategory(subcategory)}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-surface-elevated px-4 py-3 text-left transition hover:bg-surface"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-text-primary">{subcategory.title}</span>
                    <span className="shrink-0 text-xs font-semibold text-text-secondary">
                      {subcategory.children.length > 0 ? `${subcategory.children.length} subcategorías · ` : ""}Editar
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] border border-dashed border-border bg-surface-elevated px-4 py-5 text-center text-sm text-text-secondary">
                Esta categoría todavía no tiene subcategorías.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
