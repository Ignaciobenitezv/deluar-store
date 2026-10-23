"use client";

import { useReducer, useState, useTransition } from "react";
import { Badge } from "@/components/admin/ui/badge";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import {
  THEME_BASE_COLOR_KEYS,
  draftToFields,
  evaluateDraft,
  hasLocalChanges,
  hasUnpublishedChanges,
  initialEditorState,
  themeEditorReducer,
  type ThemeEditorSelection,
  type ThemeEditorState,
} from "@/features/theme/editor";
import { DEFAULT_THEME_PRESET_ID, THEME_PRESETS } from "@/features/theme/presets";
import { CUSTOM_THEME_PRESET, OVERRIDABLE_TOKEN_NAMES } from "@/features/theme/storefront-theme-document";
import { DERIVED_TOKEN_LABELS } from "@/features/theme/token-labels";
import type { ThemeBaseColors, ThemePresetId, ThemeTokenName } from "@/features/theme/types";
import type { ThemeContrastCheck } from "@/features/theme/validate";
import { cn } from "@/lib/utils";
import {
  discardStorefrontThemeDraftAction,
  publishStorefrontThemeAction,
  reloadStorefrontThemeAction,
  saveStorefrontThemeDraftAction,
} from "../actions/storefront-theme-actions";
import { contrastWarningsLabel, type ThemeWriteResult } from "../server/storefront-theme-service";
import type { AdminStorefrontThemeData } from "../server/storefront-theme-data";
import { ActionButton, FeedbackMessage, StatusRow, formatDate, type EditorFeedback } from "./settings-editor-ui";
import { StorefrontThemePreview } from "./storefront-theme-preview";
import { ThemeColorField } from "./theme-color-field";

const COLOR_FIELDS: Record<keyof ThemeBaseColors, { label: string; description: string }> = {
  canvas: { label: "Fondo", description: "Fondo general de las páginas." },
  surface: { label: "Superficies", description: "Tarjetas, paneles, header y carrito." },
  ink: { label: "Textos", description: "Títulos y texto; los secundarios se calculan de este." },
  cta: { label: "Botones", description: "Agregar al carrito, finalizar compra." },
  brand: { label: "Marca", description: "Barra de anuncios, beneficios y detalles de marca." },
  promo: { label: "Promociones", description: "Precio promocional, descuentos y banda roja." },
};

// Which of the six colours drives each token, to say what to adjust.
const TOKEN_SOURCE: Record<ThemeTokenName, keyof ThemeBaseColors | null> = {
  canvas: "canvas",
  canvasAlt: "canvas",
  surface: "surface",
  surfaceRaised: "surface",
  ink: "ink",
  inkMuted: "ink",
  line: "ink",
  lineStrong: "ink",
  focusRing: "ink",
  cta: "cta",
  ctaHover: "cta",
  ctaForeground: "cta",
  brand: "brand",
  brandHover: "brand",
  brandSoft: "brand",
  brandForeground: "brand",
  brandAlt: "brand",
  brandAltForeground: "brand",
  accent: "brand",
  accentSoft: "brand",
  promo: "promo",
  promoStrong: "promo",
  promoSoft: "promo",
  promoForeground: "promo",
  // The shared red adapts to the background on its own.
  error: null,
};

const SELECTIONS: { id: ThemeEditorSelection; label: string; description: string }[] = [
  ...(Object.values(THEME_PRESETS).map(({ id, label, description }) => ({ id, label, description })) as {
    id: ThemePresetId;
    label: string;
    description: string;
  }[]),
  {
    id: CUSTOM_THEME_PRESET as ThemeEditorSelection,
    label: "Personalizada",
    description: "Tus seis colores; el resto de los tonos se calcula solo.",
  },
].sort((a, b) => (a.id === DEFAULT_THEME_PRESET_ID ? -1 : b.id === DEFAULT_THEME_PRESET_ID ? 1 : 0));

const selectionLabel = (id: ThemeEditorSelection) => SELECTIONS.find((selection) => selection.id === id)?.label ?? id;

const formatRatio = (ratio: number) => `${ratio.toFixed(2).replace(".", ",")}:1`;

function adjustHint(check: ThemeContrastCheck) {
  const sources = [...new Set([TOKEN_SOURCE[check.foreground], TOKEN_SOURCE[check.background]])].filter(
    (source): source is keyof ThemeBaseColors => source !== null,
  );

  return sources.map((source) => COLOR_FIELDS[source].label).join(" o ");
}

function Swatches({ colors }: { colors: ThemeBaseColors }) {
  return (
    <span className="flex overflow-hidden rounded-md border border-border">
      {THEME_BASE_COLOR_KEYS.map((key) => (
        <span key={key} className="h-5 flex-1" style={{ backgroundColor: colors[key] }} />
      ))}
    </span>
  );
}

function publishedValue(state: ThemeEditorState, isAvailable: boolean) {
  if (!isAvailable) {
    return "No se pudo leer Sanity (la tienda usa Deluar editorial si no responde)";
  }

  if (state.published.status === "missing") {
    return "Ninguna · la tienda usa Deluar editorial";
  }

  if (state.published.status === "invalid") {
    return "Inválida · la tienda usa Deluar editorial";
  }

  return [selectionLabel(state.published.draft.preset), formatDate(state.published.updatedAt)].filter(Boolean).join(" · ");
}

function savedValue(state: ThemeEditorState) {
  if (!state.saved) {
    return "Ninguno";
  }

  if (state.saved.status === "invalid") {
    return "Ilegible (se puede descartar)";
  }

  return [selectionLabel(state.saved.draft.preset), formatDate(state.saved.updatedAt)].filter(Boolean).join(" · ");
}

/**
 * Configuración → Apariencia. Local edits (useReducer over the pure model in
 * features/theme/editor) → "Guardar borrador" writes only the Sanity draft →
 * "Publicar" validates on the server, publishes with revision locking and
 * refreshes the storefront cache. Any failed call leaves the local draft as is.
 */
export function StorefrontThemeEditor({ data }: { data: AdminStorefrontThemeData }) {
  const [state, dispatch] = useReducer(themeEditorReducer, data.snapshot, initialEditorState);
  const [feedback, setFeedback] = useState<EditorFeedback>(null);
  const [confirming, setConfirming] = useState<"publish" | "discardSaved" | null>(null);
  const [isPending, startTransition] = useTransition();
  const { tokens, validation } = evaluateDraft(state.draft);
  // WCAG AA misses are warnings: they never disable publishing, they only
  // require the explicit "Publicar igualmente" confirmation (checked again on the server).
  const contrastWarnings = validation.contrastIssues;
  const { draft } = state;
  const isCustom = draft.preset === CUSTOM_THEME_PRESET;
  const localChanges = hasLocalChanges(state);
  const unpublished = hasUnpublishedChanges(state);
  const writesBlocked = !data.canWrite || isPending || state.conflict !== null;
  const canPreviewOnStore = data.canWrite && state.saved?.status === "valid" && !localChanges;
  const conflictDate = state.conflict
    ? formatDate(state.conflict.saved?.updatedAt ?? state.conflict.published.updatedAt)
    : null;

  function handleResult(result: ThemeWriteResult) {
    if (result.status === "success") {
      if (result.snapshot) {
        dispatch({ type: "synced", snapshot: result.snapshot });
      }

      setFeedback({ tone: "success", message: result.message });
      return;
    }

    if (result.status === "conflict") {
      dispatch({ type: "conflict", remote: result.snapshot });
      setFeedback(null);
      return;
    }

    if (result.status === "needs_confirmation") {
      // The server found warnings this screen had not confirmed: ask again, nothing was written.
      setConfirming("publish");
      setFeedback({ tone: "warning", message: result.message, issues: result.issues });
      return;
    }

    setFeedback({ tone: "danger", message: result.message, issues: result.status === "invalid" ? result.issues : undefined });
  }

  function run(operation: () => Promise<ThemeWriteResult>) {
    setConfirming(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        handleResult(await operation());
      } catch {
        // Network failure or server crash: nothing changed locally.
        setFeedback({ tone: "danger", message: "No pudimos conectar con el servidor. Tus cambios siguen en el editor." });
      }
    });
  }

  const writeInput = () => ({
    draft: draftToFields(state.draft),
    publishedRevision: state.published.revision,
    savedRevision: state.saved?.revision ?? null,
  });

  return (
    <div className="grid items-start gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="grid min-w-0 gap-3 sm:gap-4">
        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className={dashboardUi.sectionTitle}>Estado de la paleta</h2>
              <p className={dashboardUi.sectionDescription}>Lo publicado es lo que ve la tienda; el borrador solo lo ve el panel.</p>
            </div>
            {unpublished ? <Badge tone="warning">Cambios sin publicar</Badge> : <Badge tone="success">Al día</Badge>}
          </div>

          <div className={cn(dashboardUi.cardBody, "space-y-3")}>
            <div className="divide-y divide-border">
              <StatusRow label="Publicada" value={publishedValue(state, data.isAvailable)} />
              <StatusRow
                label="Borrador guardado"
                value={savedValue(state)}
                badge={state.saved?.status === "invalid" ? <Badge tone="danger">Inválido</Badge> : null}
              />
              <StatusRow
                label="En edición"
                value={selectionLabel(draft.preset)}
                badge={localChanges ? <Badge tone="warning">Sin guardar</Badge> : null}
              />
            </div>

            {!data.canWrite && data.isAvailable ? (
              <p className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[12px] leading-5 text-warning">
                El servidor no tiene credenciales de escritura de Sanity: podés previsualizar, pero no guardar ni publicar.
              </p>
            ) : null}

            {state.conflict ? (
              <div role="alert" className="space-y-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3">
                <p className="text-[12.5px] leading-5 text-warning">
                  Otro administrador cambió la paleta mientras editabas{conflictDate ? ` (${conflictDate})` : ""}. No se
                  sobrescribió nada. Ahora: publicada {selectionLabel(state.conflict.published.draft.preset)}
                  {state.conflict.saved ? `, borrador ${selectionLabel(state.conflict.saved.draft.preset)}` : ", sin borrador"}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton tone="primary" onClick={() => dispatch({ type: "reloadRemote" })}>
                    Cargar la versión actual
                  </ActionButton>
                  <ActionButton onClick={() => dispatch({ type: "keepLocalChanges" })}>Conservar mis cambios</ActionButton>
                </div>
                <p className="text-[11px] leading-4 text-text-secondary">
                  «Cargar la versión actual» descarta tu edición. «Conservar mis cambios» la mantiene: si después guardás o
                  publicás, reemplazará la versión actual.
                </p>
              </div>
            ) : null}

            {feedback ? <FeedbackMessage feedback={feedback} /> : null}

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <ActionButton
                tone="primary"
                disabled={writesBlocked || !localChanges}
                onClick={() => run(() => saveStorefrontThemeDraftAction(writeInput()))}
              >
                {isPending ? "Procesando…" : "Guardar borrador"}
              </ActionButton>
              <ActionButton
                disabled={writesBlocked || !unpublished}
                onClick={() => setConfirming("publish")}
              >
                Publicar…
              </ActionButton>
              <ActionButton disabled={!localChanges || isPending} onClick={() => dispatch({ type: "discardLocalChanges" })}>
                Descartar cambios locales
              </ActionButton>
              <ActionButton disabled={writesBlocked || !state.saved} onClick={() => setConfirming("discardSaved")}>
                Descartar borrador guardado…
              </ActionButton>
              {state.conflict ? null : (
                <ActionButton disabled={!data.canWrite || isPending} onClick={() => run(reloadStorefrontThemeAction)}>
                  Recargar
                </ActionButton>
              )}
            </div>

            {confirming === "publish" ? (
              <div
                role="alertdialog"
                aria-label="Confirmar publicación"
                className={cn(
                  "space-y-2.5 rounded-xl border px-3.5 py-3",
                  contrastWarnings.length > 0 ? "border-warning/30 bg-warning-soft" : "border-primary/30 bg-primary-soft",
                )}
              >
                {contrastWarnings.length > 0 ? (
                  <p className="text-[12.5px] font-medium leading-5 text-warning">
                    Esta paleta tiene {contrastWarningsLabel(contrastWarnings.length)}: algunos textos podrían resultar
                    difíciles de leer. Podés publicarla igualmente o cancelar y ajustarla.
                  </p>
                ) : null}
                <p className="text-[12.5px] leading-5 text-text-primary">
                  Se publicará <strong>{selectionLabel(draft.preset)}</strong> tal como se ve en la vista previa
                  {localChanges ? " (incluye cambios sin guardar)" : ""}. La tienda la mostrará en la próxima visita.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    tone="primary"
                    onClick={() =>
                      run(() =>
                        publishStorefrontThemeAction({
                          ...writeInput(),
                          acknowledgeContrastWarnings: contrastWarnings.length > 0,
                        }),
                      )
                    }
                  >
                    {contrastWarnings.length > 0 ? "Publicar igualmente" : "Publicar ahora"}
                  </ActionButton>
                  <ActionButton onClick={() => setConfirming(null)}>Cancelar</ActionButton>
                </div>
              </div>
            ) : null}

            {confirming === "discardSaved" ? (
              <div
                role="alertdialog"
                aria-label="Confirmar descarte del borrador"
                className="space-y-2.5 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3"
              >
                <p className="text-[12.5px] leading-5 text-text-primary">
                  Se borra el borrador guardado. La paleta publicada no cambia
                  {localChanges ? "; tus cambios sin guardar quedan en el editor" : ""}.
                </p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    tone="danger"
                    onClick={() => run(() => discardStorefrontThemeDraftAction({ savedRevision: state.saved?.revision ?? null }))}
                  >
                    Descartar borrador
                  </ActionButton>
                  <ActionButton onClick={() => setConfirming(null)}>Cancelar</ActionButton>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className={dashboardUi.sectionTitle}>Paleta</h2>
              <p className={dashboardUi.sectionDescription}>
                Elegir una paleta solo cambia el editor: para aplicarla, guardá el borrador y publicalo.
              </p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div role="radiogroup" aria-label="Paleta de la tienda" className="grid gap-2 sm:grid-cols-3">
              {SELECTIONS.map((selection) => {
                const isActive = draft.preset === selection.id;
                const colors = selection.id === CUSTOM_THEME_PRESET ? draft.colors : THEME_PRESETS[selection.id].base;

                return (
                  <button
                    key={selection.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() =>
                      dispatch(
                        selection.id === CUSTOM_THEME_PRESET
                          ? { type: "selectCustom" }
                          : { type: "selectPreset", preset: selection.id },
                      )
                    }
                    className={cn(
                      "grid gap-2 rounded-xl border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isActive ? "border-primary/50 bg-primary-soft" : "border-border bg-surface hover:bg-surface-elevated",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("text-[12.5px] font-medium", isActive ? "text-primary" : "text-text-primary")}>
                        {selection.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                          isActive ? "border-primary" : "border-border",
                        )}
                      >
                        {isActive ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                      </span>
                    </span>
                    <Swatches colors={colors} />
                    <span className="text-[11px] leading-4 text-text-secondary">{selection.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className={dashboardUi.sectionTitle}>Colores</h2>
              <p className={dashboardUi.sectionDescription}>
                {isCustom
                  ? "Hover, bordes, fondos suaves y textos sobre cada color se calculan a partir de estos seis."
                  : `Son los colores de ${selectionLabel(draft.preset)}. Cambiar cualquiera crea una paleta personalizada idéntica a ella como punto de partida.`}
              </p>
            </div>
          </div>

          <div className={dashboardUi.cardBody}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {THEME_BASE_COLOR_KEYS.map((key) => (
                <ThemeColorField
                  key={key}
                  label={COLOR_FIELDS[key].label}
                  description={COLOR_FIELDS[key].description}
                  value={draft.colors[key]}
                  onCommit={(value) => dispatch({ type: "setColor", key, value })}
                />
              ))}
            </div>

            <details className="group mt-5 rounded-xl border border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-medium text-text-primary">Colores avanzados</span>
                  <span className="block text-[11px] leading-4 text-text-secondary">
                    Tonos calculados. Fijar uno lo independiza de los seis colores; el contraste se sigue validando.
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {Object.keys(draft.overrides).length > 0 ? (
                    <Badge tone="info">{Object.keys(draft.overrides).length} fijados</Badge>
                  ) : null}
                  <span aria-hidden="true" className="text-text-secondary transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </span>
              </summary>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 border-t border-border px-3.5 py-3.5 sm:grid-cols-2">
                {OVERRIDABLE_TOKEN_NAMES.map((key) => (
                  <ThemeColorField
                    key={key}
                    compact
                    label={DERIVED_TOKEN_LABELS[key]}
                    value={tokens[key]}
                    onCommit={(value) => {
                      if (value.toLowerCase() !== tokens[key]) {
                        dispatch({ type: "setOverride", key, value });
                      }
                    }}
                    aside={
                      key in draft.overrides ? (
                        <span className="flex items-center gap-1.5">
                          <Badge tone="info">Fijado</Badge>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "clearOverride", key })}
                            className="rounded-md px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <span className="text-[11px] text-primary underline-offset-2 hover:underline">Calcular</span>
                          </button>
                        </span>
                      ) : null
                    }
                  />
                ))}
              </div>
            </details>
          </div>
        </section>

        <section className={dashboardUi.card}>
          <div className={dashboardUi.cardHeader}>
            <div className="min-w-0">
              <h2 className={dashboardUi.sectionTitle}>Contraste y accesibilidad</h2>
              <p className={dashboardUi.sectionDescription}>
                Cada texto debe leerse sobre su fondo según WCAG AA: 4,5:1 para texto y 3:1 para bordes y foco.
              </p>
            </div>
            {validation.meetsAA ? (
              <Badge tone="success">Cumple AA</Badge>
            ) : (
              <Badge tone="warning">
                {contrastWarnings.length} {contrastWarnings.length === 1 ? "advertencia" : "advertencias"}
              </Badge>
            )}
          </div>

          <div className={dashboardUi.cardBody} aria-live="polite">
            {validation.meetsAA ? (
              <p className="text-[12.5px] leading-5 text-text-secondary">
                Las {validation.checks.length} combinaciones que usa la tienda tienen contraste suficiente.
              </p>
            ) : (
              <div className="space-y-2.5">
                <p className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[12px] leading-5 text-warning">
                  La paleta se puede publicar, pero algunos textos podrían resultar difíciles de leer. Revisá estas
                  combinaciones; al publicar se te pedirá confirmación.
                </p>
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {contrastWarnings.map((error) => (
                    <li key={error.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3.5 py-2.5">
                      <span className="text-[12.5px] text-text-primary">{error.label}</span>
                      <span className="text-[11px] tabular-nums text-text-secondary">
                        <span className="font-semibold text-warning">{formatRatio(error.ratio)}</span> · recomendado{" "}
                        {formatRatio(error.minRatio)}
                        {adjustHint(error) ? ` · ajustá ${adjustHint(error)}` : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {validation.warnings.map((warning) => (
                  <li
                    key={warning.id}
                    className="rounded-xl border border-warning/25 bg-warning-soft px-3.5 py-2.5 text-[12px] leading-5 text-warning"
                  >
                    {warning.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      </div>

      <section className={cn(dashboardUi.card, "min-w-0 xl:sticky xl:top-4")}>
        <div className={dashboardUi.cardHeader}>
          <div className="min-w-0">
            <h2 className={dashboardUi.sectionTitle}>Vista previa</h2>
            <p className={dashboardUi.sectionDescription}>
              {selectionLabel(draft.preset)} · solo en esta pantalla, la tienda no cambia.
            </p>
          </div>
          {unpublished ? <Badge tone="warning">Sin publicar</Badge> : <Badge>Igual a la tienda</Badge>}
        </div>

        <div className={dashboardUi.cardBody}>
          <StorefrontThemePreview tokens={tokens} />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
            <p className="max-w-sm text-[11px] leading-4 text-text-secondary">
              {canPreviewOnStore
                ? "Abre la tienda con el borrador guardado. Solo la ves vos, mientras tengas la sesión iniciada."
                : "Para ver el borrador en la tienda real, guardalo primero."}
            </p>
            <form action="/api/admin/theme-preview" method="post" target="_blank">
              <input type="hidden" name="action" value="enable" />
              <button
                type="submit"
                disabled={!canPreviewOnStore}
                className={cn(
                  dashboardUi.softAction,
                  "inline-flex h-8 items-center justify-center px-3 font-medium disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <span className="text-[12px]">Ver borrador en la tienda ↗</span>
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
