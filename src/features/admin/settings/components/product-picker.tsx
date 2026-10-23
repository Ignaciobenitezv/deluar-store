"use client";

import { useEffect, useId, useState } from "react";
import { Badge } from "@/components/admin/ui/badge";
import { Input } from "@/components/admin/ui/input";
import { formatProductPrice } from "@/features/catalog/components/product-card-formatting";
import type { ProductSummary } from "@/features/storefront-copy/editor";
import { cn } from "@/lib/utils";
import { searchPickerProductsAction } from "../actions/storefront-copy-actions";
import { ActionButton } from "./settings-editor-ui";

const SEARCH_DELAY_MS = 300;

function Thumb({ product, className }: { product: ProductSummary | undefined; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden rounded-md border border-border bg-surface-elevated", className)}>
      {product?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail from the Sanity CDN
        <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-30"
    >
      <span className="text-[13px] leading-none">{children}</span>
    </button>
  );
}

/**
 * Pick, order and remove the products of one home list. Nothing picked means
 * "automático": the list keeps its usual source, shown here as it is now.
 */
export function ProductPicker({
  label,
  description,
  automaticNote,
  max,
  picked,
  automatic,
  products,
  disabled,
  onChange,
  onDiscover,
}: {
  label: string;
  description?: string;
  automaticNote: string;
  max: number;
  /** Picked ids in order, or undefined while automatic. */
  picked: string[] | undefined;
  /** What the automatic source shows now. */
  automatic: string[];
  products: Record<string, ProductSummary>;
  disabled: boolean;
  onChange: (ids: string[] | null) => void;
  /** Search results, so the editor can show them once picked. */
  onDiscover: (found: ProductSummary[]) => void;
}) {
  const searchId = useId();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // An empty pick is stored as automatic; this keeps the manual view open while emptying or starting from nothing.
  const [manualMode, setManualMode] = useState(picked !== undefined);
  const isManual = picked !== undefined || manualMode;
  const ids = picked ?? [];
  const isFull = ids.length >= max;

  useEffect(() => {
    const query = term.trim();

    if (query.length < 2) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);

      try {
        const result = await searchPickerProductsAction(query);

        if (cancelled) {
          return;
        }

        if (result.status === "success") {
          setResults(result.products);
          setError(null);
          onDiscover(result.products);
        } else {
          setError(result.message);
        }
      } catch {
        if (!cancelled) setError("No pudimos buscar productos. Intentá de nuevo.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // onDiscover is a fresh closure each render; searching again on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const move = (index: number, offset: number) => {
    const next = [...ids];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };

  const visibleResults = term.trim().length >= 2 ? results.filter((product) => !ids.includes(product.id)) : [];

  return (
    <div className="grid gap-3 rounded-xl border border-border p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-text-primary">{label}</p>
          {description ? <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{description}</p> : null}
        </div>
        {isManual ? (
          <Badge tone="info">
            {ids.length}/{max} elegidos
          </Badge>
        ) : (
          <Badge>Automático</Badge>
        )}
      </div>

      {isManual ? (
        <>
          {ids.length > 0 ? (
            <ol className="grid gap-1.5">
              {ids.map((id, index) => {
                const product = products[id];

                return (
                  <li key={id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-2 py-1.5">
                    <span className="w-4 text-center text-[11px] tabular-nums text-text-secondary">{index + 1}</span>
                    <Thumb product={product} className="h-9 w-9" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-text-primary">{product?.title ?? "Producto no encontrado"}</span>
                      <span className="flex items-center gap-1.5 text-[11px] tabular-nums text-text-secondary">
                        {product ? formatProductPrice(product.basePrice) : id}
                        {product && !product.available ? <Badge tone="warning">No se muestra</Badge> : null}
                      </span>
                    </span>
                    <IconButton label="Subir" onClick={() => move(index, -1)} disabled={disabled || index === 0}>
                      ↑
                    </IconButton>
                    <IconButton label="Bajar" onClick={() => move(index, 1)} disabled={disabled || index === ids.length - 1}>
                      ↓
                    </IconButton>
                    <IconButton label="Quitar" onClick={() => onChange(ids.filter((item) => item !== id))} disabled={disabled}>
                      ✕
                    </IconButton>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-[11.5px] leading-4 text-text-secondary">
              Sin productos elegidos: mientras la lista esté vacía, se usa la automática.
            </p>
          )}

          <div className="grid gap-1.5">
            <label htmlFor={searchId} className="text-[11.5px] font-medium text-text-primary">
              {isFull ? `Llegaste al máximo de ${max}. Quitá uno para agregar otro.` : "Agregar producto"}
            </label>
            <Input
              id={searchId}
              type="search"
              value={term}
              disabled={disabled || isFull}
              placeholder="Buscá por nombre…"
              autoComplete="off"
              onChange={(event) => setTerm(event.target.value)}
              className="text-[13px]"
            />
            {error ? <p className="text-[11px] text-danger">{error}</p> : null}
            {term.trim().length >= 2 && !isFull ? (
              <ul className="grid max-h-64 gap-1 overflow-y-auto rounded-lg border border-border bg-surface p-1">
                {searching && visibleResults.length === 0 ? (
                  <li className="px-2 py-1.5 text-[11.5px] text-text-secondary">Buscando…</li>
                ) : null}
                {!searching && visibleResults.length === 0 ? (
                  <li className="px-2 py-1.5 text-[11.5px] text-text-secondary">No hay productos con ese nombre.</li>
                ) : null}
                {visibleResults.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        onChange([...ids, product.id]);
                        setTerm("");
                        setResults([]);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    >
                      <Thumb product={product} className="h-8 w-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-text-primary">{product.title}</span>
                        <span className="text-[11px] tabular-nums text-text-secondary">{formatProductPrice(product.basePrice)}</span>
                      </span>
                      {!product.available ? <Badge tone="warning">Sin stock / oculto</Badge> : null}
                      <span className="text-[11.5px] font-medium text-primary">Agregar</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div>
            <ActionButton
              disabled={disabled}
              onClick={() => {
                setManualMode(false);
                onChange(null);
              }}
            >
              Volver a automático
            </ActionButton>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-2">
            <p className="text-[11.5px] leading-4 text-text-secondary">{automaticNote} Hoy se muestran:</p>
            {automatic.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {automatic.map((id) => (
                  <span key={id} title={products[id]?.title} className="block">
                    <Thumb product={products[id]} className="h-11 w-11" />
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-text-secondary">Ningún producto.</p>
            )}
          </div>
          <div>
            <ActionButton
              tone="primary"
              disabled={disabled}
              // Starts from what shows now, so picking is editing the current list.
              onClick={() => {
                setManualMode(true);
                onChange(automatic.slice(0, max));
              }}
            >
              Elegir productos a mano
            </ActionButton>
          </div>
        </>
      )}
    </div>
  );
}
