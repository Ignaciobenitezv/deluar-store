"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "../actions/create-product-action";
import { buildAdminProductSlugFromTitle } from "../lib/product-slug";
import type { AdminProductCategoryNode, AdminProductCreateActionState } from "../types";
import type { AdminProductCreateField } from "../validation/create-product";
import { cn } from "@/lib/utils";

const INITIAL_STATE: AdminProductCreateActionState = { status: "idle" };

const FIELD =
  "w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-[13.5px] text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-[#3b7ff5] focus:ring-2 focus:ring-[#3b7ff5]/15 disabled:bg-slate-50 disabled:text-slate-400";
const LABEL = "mb-1.5 block text-[12px] font-medium text-slate-700";
const HINT = "mt-1 text-[11.5px] leading-[1.4] text-slate-500";

function getError(state: AdminProductCreateActionState, field: AdminProductCreateField) {
  if (state.status !== "error" || !state.fieldErrors) {
    return null;
  }

  return state.fieldErrors[field]?.[0] ?? null;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-[11.5px] font-medium text-[#c0392f]">{message}</p>;
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    >
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}

function AdminProductCreateForm({
  categoryTree,
  onClose,
}: {
  categoryTree: AdminProductCategoryNode[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createProductAction, INITIAL_STATE);

  const [title, setTitle] = useState("");
  /** The slug follows the title until the admin edits it, then it stays put. */
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");

  /**
   * Subcategories nest two levels deep and the product schema accepts either,
   * so both are offered — indented, the way the catalog filters show them.
   */
  const subcategories = useMemo(() => {
    const flatten = (
      nodes: AdminProductCategoryNode[],
      depth = 0,
    ): { id: string; label: string }[] =>
      nodes.flatMap((node) => [
        { id: node._id, label: `${"— ".repeat(depth)}${node.title}` },
        ...flatten(node.subcategories ?? [], depth + 1),
      ]);

    const category = categoryTree.find((node) => node._id === categoryId);
    return flatten(category?.subcategories ?? []);
  }, [categoryTree, categoryId]);

  useEffect(() => {
    if (!slugTouched) {
      setSlug(buildAdminProductSlugFromTitle(title));
    }
  }, [slugTouched, title]);

  const createdId = state.status === "success" ? state.productId : null;

  useEffect(() => {
    if (!createdId) {
      return;
    }

    // Straight into the detail page, where the images editor already lives.
    router.push(`/admin/productos/${createdId}`);
  }, [createdId, router]);

  return (
    <form action={formAction} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div>
          <label className={LABEL} htmlFor="create-title">
            Nombre del producto
          </label>
          <input
            id="create-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Remera oversize algodón"
            className={FIELD}
            autoFocus
          />
          <FieldError message={getError(state, "title")} />
        </div>

        <div>
          <label className={LABEL} htmlFor="create-slug">
            URL
          </label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[12.5px] text-slate-400">/productos/</span>
            <input
              id="create-slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="remera-oversize-algodon"
              className={FIELD}
            />
          </div>
          <p className={HINT}>Se genera sola desde el nombre. Editala si querés otra.</p>
          <FieldError message={getError(state, "slug")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="create-category">
              Categoría
            </label>
            <select
              id="create-category"
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={FIELD}
            >
              <option value="">Elegí una categoría</option>
              {categoryTree.map((node) => (
                <option key={node._id} value={node._id}>
                  {node.title}
                </option>
              ))}
            </select>
            <FieldError message={getError(state, "categoryId")} />
          </div>

          <div>
            <label className={LABEL} htmlFor="create-subcategory">
              Subcategoría <span className="font-normal text-slate-400">· opcional</span>
            </label>
            <select
              id="create-subcategory"
              name="subcategoryId"
              className={FIELD}
              disabled={subcategories.length === 0}
              defaultValue=""
            >
              <option value="">
                {subcategories.length === 0 ? "Sin subcategorías" : "Sin subcategoría"}
              </option>
              {subcategories.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="create-short-description">
            Descripción corta
          </label>
          <textarea
            id="create-short-description"
            name="shortDescription"
            rows={2}
            maxLength={240}
            placeholder="La que se ve en el listado y en las tarjetas de producto."
            className={cn(FIELD, "resize-y")}
          />
          <p className={HINT}>Entre 10 y 240 caracteres.</p>
          <FieldError message={getError(state, "shortDescription")} />
        </div>

        <div>
          <label className={LABEL} htmlFor="create-description">
            Descripción completa
          </label>
          <textarea
            id="create-description"
            name="description"
            rows={5}
            placeholder="Materiales, calce, cuidados…"
            className={cn(FIELD, "resize-y")}
          />
          <p className={HINT}>
            Dejá una línea en blanco entre párrafos. Después podés darle formato en el detalle.
          </p>
          <FieldError message={getError(state, "description")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={LABEL} htmlFor="create-base-price">
              Precio de lista
            </label>
            <input
              id="create-base-price"
              name="basePrice"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="0"
              className={cn(FIELD, "tabular-nums")}
            />
            <FieldError message={getError(state, "basePrice")} />
          </div>

          <div>
            <label className={LABEL} htmlFor="create-transfer-price">
              Transferencia <span className="font-normal text-slate-400">· opcional</span>
            </label>
            <input
              id="create-transfer-price"
              name="transferPrice"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="—"
              className={cn(FIELD, "tabular-nums")}
            />
            <FieldError message={getError(state, "transferPrice")} />
          </div>

          <div>
            <label className={LABEL} htmlFor="create-stock">
              Stock
            </label>
            <input
              id="create-stock"
              name="stock"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={0}
              className={cn(FIELD, "tabular-nums")}
            />
            <FieldError message={getError(state, "stock")} />
          </div>
        </div>

        {/* The one required field this form deliberately leaves open. */}
        <div className="flex items-start gap-2.5 rounded-[8px] bg-[#f1f6fe] px-4 py-3">
          <span
            aria-hidden
            className="mt-[1px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-[#3b7ff5] text-white"
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-[10px] w-[10px]">
              <path d="M7 3.4v4.2M7 10.1v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <p className="text-[12px] leading-[1.45] text-slate-600">
            El producto se crea <span className="font-medium text-slate-800">oculto en la tienda</span>. Al
            guardar vas directo al detalle para cargar las imágenes y publicarlo.
          </p>
        </div>

        {state.status === "error" && !state.fieldErrors ? (
          <p className="rounded-[8px] bg-[#fbeceb] px-4 py-3 text-[12.5px] text-[#a8352c]">
            {state.message}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-[#f8fafc] px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-[8px] border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[8px] bg-[#3b7ff5] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#2f6de0] disabled:opacity-60"
        >
          {pending ? "Creando…" : "Crear producto"}
        </button>
      </div>
    </form>
  );
}

export function AdminProductCreateDialog({
  categoryTree,
}: {
  categoryTree: AdminProductCategoryNode[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#3b7ff5] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2f6de0] sm:text-sm"
      >
        <PlusIcon />
        Crear producto
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="flex max-h-[min(88vh,780px)] w-full max-w-[620px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <h2
                id="create-product-title"
                className="text-[17px] font-semibold tracking-[-0.015em] text-slate-900"
              >
                Crear producto
              </h2>
              <p className="mt-1 text-[12.5px] text-slate-500">
                Cargá los datos básicos. Las imágenes se agregan en el paso siguiente.
              </p>
            </div>

            <AdminProductCreateForm categoryTree={categoryTree} onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
