"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  addShipmentParcelAction,
  deleteShipmentParcelAction,
  markShipmentReadyAction,
  prepareShipmentAction,
  updateShipmentRecipientAction,
  updateShipmentBranchAction,
  updateShipmentCarrierAction,
  updateShipmentParcelAction,
} from "../server/shipment-actions";
import { getShipmentCarrierLabel, getShipmentStatusLabel } from "../labels";
import type { Order } from "@/features/order/types";
import {
  SHIPMENT_CARRIERS,
  SHIPMENT_STATUSES,
  type ShipmentActionState,
  type ShipmentAdminView,
} from "../types";
import {
  isPickupShippingMethod,
  SHIPPING_METHODS,
  type ShippingMethod,
} from "@/features/shipping/shipping";

const INITIAL_STATE: ShipmentActionState = {
  status: "idle",
};

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("es-AR").format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function sumIfComplete(values: Array<number | null | undefined>) {
  if (values.length === 0 || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return null;
  }

  return values.reduce<number>((accumulator, value) => accumulator + (value ?? 0), 0);
}

function ActionFeedback({ state }: { state: ShipmentActionState }) {
  if (state.status === "idle") {
    return null;
  }

  const tone =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-rose-200 bg-rose-50 text-rose-900";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      <p className="font-medium">{state.message}</p>
      {state.errors?.length ? (
        <ul className="mt-2 space-y-1 text-xs leading-5">
          {state.errors.map((error) => (
            <li key={`${error.field}-${error.code}`}>{error.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RecipientEditor({
  orderId,
  shippingAddress,
}: {
  orderId: string;
  shippingAddress: Order["shippingAddress"];
}) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [state, formAction, pending] = useActionState(updateShipmentRecipientAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success" || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    const timeout = window.setTimeout(() => {
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "success") {
      refreshedRef.current = false;
    }
  }, [state.status]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Datos del destinatario</p>
        <p className="text-sm text-muted">
          Completa o corrige el snapshot de este envio. No modifica el cliente global.
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input type="hidden" name="orderId" value={orderId} />

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Nombre *</span>
          <input
            type="text"
            name="firstName"
            defaultValue={shippingAddress?.firstName ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Apellido *</span>
          <input
            type="text"
            name="lastName"
            defaultValue={shippingAddress?.lastName ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">DNI *</span>
          <input
            type="text"
            name="dni"
            defaultValue={shippingAddress?.dni ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Email *</span>
          <input
            type="email"
            name="email"
            defaultValue={shippingAddress?.email ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Telefono *</span>
          <input
            type="text"
            name="phone"
            defaultValue={shippingAddress?.phone ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Codigo de area *</span>
          <input
            type="text"
            name="phoneAreaCode"
            defaultValue={shippingAddress?.phoneAreaCode ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Numero local *</span>
          <input
            type="text"
            name="phoneNumber"
            defaultValue={shippingAddress?.phoneNumber ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Calle *</span>
          <input
            type="text"
            name="street"
            defaultValue={shippingAddress?.street ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Numero *</span>
          <input
            type="text"
            name="streetNumber"
            defaultValue={shippingAddress?.streetNumber ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Piso</span>
          <input
            type="text"
            name="floor"
            defaultValue={shippingAddress?.floor ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Departamento</span>
          <input
            type="text"
            name="apartment"
            defaultValue={shippingAddress?.apartment ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Localidad *</span>
          <input
            type="text"
            name="city"
            defaultValue={shippingAddress?.city ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Provincia *</span>
          <input
            type="text"
            name="province"
            defaultValue={shippingAddress?.province ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Codigo postal *</span>
          <input
            type="text"
            name="postalCode"
            defaultValue={shippingAddress?.postalCode ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-3">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Observaciones</span>
          <textarea
            name="notes"
            defaultValue={shippingAddress?.notes ?? ""}
            rows={3}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Guardando..." : "Guardar destinatario"}
          </button>
        </div>
      </form>

      <ActionFeedback state={state} />
    </div>
  );
}

function CarrierEditor({ shipment, orderId }: { shipment: ShipmentAdminView; orderId: string }) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [state, formAction, pending] = useActionState(updateShipmentCarrierAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success" || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    const timeout = window.setTimeout(() => {
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "success") {
      refreshedRef.current = false;
    }
  }, [state.status]);

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="shipmentId" value={shipment.id} />
        <input type="hidden" name="orderId" value={orderId} />
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Carrier</span>
          <select
            name="carrier"
            defaultValue={shipment.carrier ?? ""}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none"
          >
            <option value="">Sin carrier</option>
            <option value={SHIPMENT_CARRIERS.ANDREANI}>Andreani</option>
            <option value={SHIPMENT_CARRIERS.CORREO_ARGENTINO}>Correo Argentino</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Guardando..." : "Guardar carrier"}
        </button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}

function BranchEditor({ shipment, orderId }: { shipment: ShipmentAdminView; orderId: string }) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [state, formAction, pending] = useActionState(updateShipmentBranchAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success" || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    const timeout = window.setTimeout(() => {
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "success") {
      refreshedRef.current = false;
    }
  }, [state.status]);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Sucursal de destino</p>
        <p className="text-sm text-muted">
          Carga manual temporal hasta conectar el catalogo del transportista.
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <input type="hidden" name="shipmentId" value={shipment.id} />
        <input type="hidden" name="orderId" value={orderId} />

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">External ID *</span>
          <input
            type="text"
            name="branchExternalId"
            defaultValue={shipment.branchExternalId ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Codigo</span>
          <input
            type="text"
            name="branchCode"
            defaultValue={shipment.branchCode ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Nombre *</span>
          <input
            type="text"
            name="branchName"
            defaultValue={shipment.branchName ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Direccion *</span>
          <input
            type="text"
            name="branchAddress"
            defaultValue={shipment.branchAddress ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Localidad *</span>
          <input
            type="text"
            name="branchCity"
            defaultValue={shipment.branchCity ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Provincia *</span>
          <input
            type="text"
            name="branchProvince"
            defaultValue={shipment.branchProvince ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-1">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Codigo postal *</span>
          <input
            type="text"
            name="branchPostalCode"
            defaultValue={shipment.branchPostalCode ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Guardando..." : "Guardar sucursal"}
          </button>
        </div>
      </form>

      <ActionFeedback state={state} />

      <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted">
        <p className="font-medium text-foreground">Sucursal guardada</p>
        <div className="mt-2 grid gap-1">
          <p>External ID: {shipment.branchExternalId ?? "-"}</p>
          <p>Codigo: {shipment.branchCode ?? "-"}</p>
          <p>Nombre: {shipment.branchName ?? "-"}</p>
          <p>Direccion: {shipment.branchAddress ?? "-"}</p>
          <p>Localidad: {shipment.branchCity ?? "-"}</p>
          <p>Provincia: {shipment.branchProvince ?? "-"}</p>
          <p>Codigo postal: {shipment.branchPostalCode ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}

function PrepareShipmentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [state, formAction, pending] = useActionState(prepareShipmentAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success" || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    const timeout = window.setTimeout(() => {
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "success") {
      refreshedRef.current = false;
    }
  }, [state.status]);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="orderId" value={orderId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Preparando..." : "Preparar envio"}
        </button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}

function MarkReadyButton({ shipmentId, orderId }: { shipmentId: string; orderId: string }) {
  const router = useRouter();
  const refreshedRef = useRef(false);
  const [state, formAction, pending] = useActionState(markShipmentReadyAction, INITIAL_STATE);

  useEffect(() => {
    if (state.status !== "success" || refreshedRef.current) {
      return;
    }

    refreshedRef.current = true;
    const timeout = window.setTimeout(() => {
      router.refresh();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [router, state.status]);

  useEffect(() => {
    if (state.status !== "success") {
      refreshedRef.current = false;
    }
  }, [state.status]);

  return (
    <div className="space-y-3">
      <form action={formAction}>
        <input type="hidden" name="shipmentId" value={shipmentId} />
        <input type="hidden" name="orderId" value={orderId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Validando..." : "Marcar listo"}
        </button>
      </form>
      <ActionFeedback state={state} />
    </div>
  );
}

function ParcelEditor({
  parcel,
  orderId,
}: {
  parcel: ShipmentAdminView["parcels"][number];
  orderId: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Bulto {parcel.sequence}</p>
          <p className="mt-1 text-sm text-muted">
            Peso calculado: {formatNumber(parcel.calculatedWeightGrams)} g
          </p>
        </div>

        <form action={deleteShipmentParcelAction}>
          <input type="hidden" name="parcelId" value={parcel.id} />
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
          >
            Eliminar
          </button>
        </form>
      </div>

      <form action={updateShipmentParcelAction} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input type="hidden" name="parcelId" value={parcel.id} />
        <input type="hidden" name="orderId" value={orderId} />

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Peso final (g)</span>
          <input
            type="number"
            name="weightGrams"
            min={1}
            step={1}
            defaultValue={parcel.weightGrams ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Alto (cm)</span>
          <input
            type="number"
            name="heightCm"
            min={1}
            step={1}
            defaultValue={parcel.heightCm ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Ancho (cm)</span>
          <input
            type="number"
            name="widthCm"
            min={1}
            step={1}
            defaultValue={parcel.widthCm ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Profundidad (cm)</span>
          <input
            type="number"
            name="depthCm"
            min={1}
            step={1}
            defaultValue={parcel.depthCm ?? ""}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold"
          >
            Guardar bulto
          </button>
        </div>
      </form>

      <p className="mt-3 text-xs leading-5 text-muted">
        Andreani requiere que alto + ancho + profundidad sea al menos 35 cm.
      </p>
    </div>
  );
}

function ShipmentDraftCard({
  shipment,
  orderId,
}: {
  shipment: ShipmentAdminView;
  orderId: string;
}) {
  const calculatedWeight = sumIfComplete(shipment.parcels.map((parcel) => parcel.calculatedWeightGrams));
  const finalWeight = sumIfComplete(shipment.parcels.map((parcel) => parcel.weightGrams));
  const hasCarrier = Boolean(shipment.carrier);
  const hasBranch = Boolean(
    shipment.branchExternalId ||
      shipment.branchName ||
      shipment.branchAddress ||
      shipment.branchCity ||
      shipment.branchProvince ||
      shipment.branchPostalCode,
  );
  const isCityBranch = shipment.shippingMethod === SHIPPING_METHODS.CITY_BRANCH;

  return (
    <article className="rounded-3xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Shipment DRAFT</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {getShipmentStatusLabel(shipment.status)}
          </h3>
          <p className="mt-1 text-sm text-muted">Creado {formatDate(shipment.createdAt)}</p>
        </div>

        <CarrierEditor shipment={shipment} orderId={orderId} />
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-background/80 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Bultos</p>
          <p className="mt-1 text-base font-semibold text-foreground">{shipment.parcels.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/80 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Peso calculado</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {formatNumber(calculatedWeight)} g
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background/80 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Peso final</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatNumber(finalWeight)} g</p>
        </div>
        <div className="rounded-2xl border border-border bg-background/80 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Readiness</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {shipment.readinessErrors.length === 0 ? "OK" : "Pendiente"}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">Errores</h4>
        {shipment.readinessErrors.length > 0 ? (
          <ul className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {shipment.readinessErrors.map((error) => (
              <li key={`${error.field}-${error.code}`}>{error.message}</li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            El shipment esta listo para validacion final.
          </p>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {isCityBranch ? (
          shipment.carrier ? (
            <BranchEditor shipment={shipment} orderId={orderId} />
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Primero selecciona un carrier para cargar la sucursal de destino.
            </div>
          )
        ) : null}
        {shipment.parcels.map((parcel) => (
          <ParcelEditor key={parcel.id} parcel={parcel} orderId={orderId} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <form action={addShipmentParcelAction}>
          <input type="hidden" name="shipmentId" value={shipment.id} />
          <input type="hidden" name="orderId" value={orderId} />
          <button
            type="submit"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold"
          >
            Agregar bulto
          </button>
        </form>

        <MarkReadyButton shipmentId={shipment.id} orderId={orderId} />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted">
        <p>Tracking: {shipment.trackingNumber ?? "-"}</p>
        <p className="mt-1">Carrier external id: {shipment.carrierExternalId ?? "-"}</p>
        <p className="mt-1">
          Carrier seleccionado: {hasCarrier ? getShipmentCarrierLabel(shipment.carrier) : "Sin carrier"}
        </p>
        {hasBranch ? (
          <div className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm">
            <p className="font-medium text-foreground">Sucursal</p>
            <div className="mt-2 grid gap-1">
              <p>External ID: {shipment.branchExternalId ?? "-"}</p>
              <p>Codigo: {shipment.branchCode ?? "-"}</p>
              <p>Nombre: {shipment.branchName ?? "-"}</p>
              <p>Direccion: {shipment.branchAddress ?? "-"}</p>
              <p>Localidad: {shipment.branchCity ?? "-"}</p>
              <p>Provincia: {shipment.branchProvince ?? "-"}</p>
              <p>Codigo postal: {shipment.branchPostalCode ?? "-"}</p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ShipmentHistoryCard({ shipment }: { shipment: ShipmentAdminView }) {
  return (
    <article className="rounded-3xl border border-border bg-background p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Shipment historico</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">
            {getShipmentStatusLabel(shipment.status)}
          </h3>
          <p className="mt-1 text-sm text-muted">Creado {formatDate(shipment.createdAt)}</p>
        </div>

        <div className="text-right text-sm text-muted">
          <p>{getShipmentCarrierLabel(shipment.carrier)}</p>
          <p className="mt-1">{shipment.parcels.length} bulto(s)</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Peso final</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {formatNumber(sumIfComplete(shipment.parcels.map((parcel) => parcel.weightGrams)))} g
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Ready at</p>
          <p className="mt-1 text-base font-semibold text-foreground">{formatDate(shipment.readyAt)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Tracking</p>
          <p className="mt-1 text-base font-semibold text-foreground">{shipment.trackingNumber ?? "-"}</p>
        </div>
      </div>

      {shipment.branchExternalId ||
      shipment.branchCode ||
      shipment.branchName ||
      shipment.branchAddress ||
      shipment.branchCity ||
      shipment.branchProvince ||
      shipment.branchPostalCode ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface p-3 text-sm text-muted">
          <p className="font-medium text-foreground">Sucursal</p>
          <div className="mt-2 grid gap-1">
            <p>External ID: {shipment.branchExternalId ?? "-"}</p>
            <p>Codigo: {shipment.branchCode ?? "-"}</p>
            <p>Nombre: {shipment.branchName ?? "-"}</p>
            <p>Direccion: {shipment.branchAddress ?? "-"}</p>
            <p>Localidad: {shipment.branchCity ?? "-"}</p>
            <p>Provincia: {shipment.branchProvince ?? "-"}</p>
            <p>Codigo postal: {shipment.branchPostalCode ?? "-"}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ShipmentAdminPanel({
  orderId,
  shippingMethod,
  shipments,
  shippingAddress,
}: {
  orderId: string;
  shippingMethod: ShippingMethod;
  shipments: ShipmentAdminView[];
  shippingAddress: Order["shippingAddress"];
}) {
  if (isPickupShippingMethod(shippingMethod)) {
    return null;
  }

  const draftShipment = shipments.find((shipment) => shipment.status === SHIPMENT_STATUSES.DRAFT) ?? null;
  const historyShipments = shipments.filter((shipment) => shipment.id !== draftShipment?.id);

  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Shipment</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Preparacion de envio</h2>
          <p className="mt-1 text-sm text-muted">
            Capa carrier-agnostic para preparar el envio sin llamar todavia a Andreani ni Correo Argentino.
          </p>
        </div>

        {!draftShipment || draftShipment.parcels.length === 0 ? (
          <PrepareShipmentButton orderId={orderId} />
        ) : null}
      </div>

      <div className="mt-5">
        <RecipientEditor orderId={orderId} shippingAddress={shippingAddress} />
      </div>

      {draftShipment ? (
        <div className="mt-5">
          <ShipmentDraftCard shipment={draftShipment} orderId={orderId} />
        </div>
      ) : null}

      {historyShipments.length > 0 ? (
        <div className="mt-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted">
            Shipments historicos
          </h3>
          <div className="space-y-4">
            {historyShipments.map((shipment) => (
              <ShipmentHistoryCard key={shipment.id} shipment={shipment} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
