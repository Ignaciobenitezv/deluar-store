"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { CheckoutFormErrors, CheckoutFormValues } from "@/features/checkout/types";
import {
  isGetnetEnabled,
  isUnicobrosEnabled,
  PAYMENT_METHODS,
} from "@/features/payments/types";
import {
  getInitialCheckoutFormValues,
  validateCheckoutForm,
} from "@/features/checkout/validation";
import {
  getShippingOptions,
  isPickupShippingMethod,
  requiresLocationFields,
  requiresStreetAddress,
  type ShippingMethod,
} from "@/features/shipping/shipping";

type CheckoutFormProps = {
  onSubmit: (values: CheckoutFormValues) => void | Promise<void>;
  onValuesChange?: (values: CheckoutFormValues) => void;
  isSubmitting?: boolean;
  subtotal: number;
  submitLabel?: string;
};

type FieldProps = {
  id: Exclude<keyof CheckoutFormValues, "paymentMethod" | "shippingMethod">;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  onChange: (
    field: Exclude<keyof CheckoutFormValues, "paymentMethod" | "shippingMethod">,
    value: string,
  ) => void;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function Field({
  id,
  label,
  value,
  error,
  required = true,
  multiline = false,
  onChange,
}: FieldProps) {
  const sharedClassName = cn(
    "w-full rounded-[1.2rem] border bg-white/86 px-4 py-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70",
    error
      ? "border-[var(--color-accent-strong)]/55 bg-[rgba(167,88,60,0.03)]"
      : "border-border/80 focus:border-foreground/30",
  );

  return (
    <label className="space-y-2.5">
      <span className="text-sm font-medium tracking-[0.01em] text-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={4}
          onChange={(event) => onChange(id, event.target.value)}
          className={cn(sharedClassName, "min-h-30 resize-none")}
        />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
          className={sharedClassName}
        />
      )}
      {error ? (
        <p className="text-sm leading-6 text-[var(--color-accent-strong)]">{error}</p>
      ) : null}
    </label>
  );
}

export function CheckoutForm({
  onSubmit,
  onValuesChange,
  isSubmitting = false,
  subtotal,
  submitLabel = "Continuar al pago",
}: CheckoutFormProps) {
  const [values, setValues] = useState<CheckoutFormValues>(getInitialCheckoutFormValues);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});
  const shippingOptions = getShippingOptions(subtotal);
  const showAddressField = requiresStreetAddress(values.shippingMethod);
  const showLocationFields = requiresLocationFields(values.shippingMethod);
  const isPickupMethod = isPickupShippingMethod(values.shippingMethod);

  useEffect(() => {
    onValuesChange?.(values);
  }, [onValuesChange, values]);

  const handleChange = (
    field: Exclude<keyof CheckoutFormValues, "paymentMethod" | "shippingMethod">,
    value: string,
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleShippingMethodChange = (shippingMethod: ShippingMethod) => {
    setValues((current) => ({ ...current, shippingMethod }));
    setErrors((current) => ({
      ...current,
      shippingMethod: undefined,
      address: undefined,
      city: undefined,
      province: undefined,
      postalCode: undefined,
    }));
  };

  const handlePaymentMethodChange = (paymentMethod: CheckoutFormValues["paymentMethod"]) => {
    setValues((current) => ({ ...current, paymentMethod }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateCheckoutForm(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSubmit({
      ...values,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      postalCode: values.postalCode.trim(),
      notes: values.notes.trim(),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-7 rounded-[2rem] border border-border/80 bg-[linear-gradient(180deg,rgba(255,253,249,0.97),rgba(245,239,230,0.94))] px-6 py-7 shadow-[0_24px_60px_rgba(58,40,26,0.05)] sm:px-8 sm:py-8"
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Datos del comprador</p>
        <h2 className="text-3xl font-semibold tracking-[0.03em] text-foreground">
          Completa tus datos
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-muted sm:text-base">
          Ingresa la informacion de contacto y entrega para que podamos preparar tu
          orden correctamente antes del paso de pago.
        </p>
      </div>

      <section className="space-y-5 rounded-[1.5rem] border border-border/75 bg-white/68 px-5 py-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Contacto</p>
          <h3 className="text-xl font-semibold tracking-[0.03em] text-foreground">
            Datos personales
          </h3>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="firstName"
            label="Nombre"
            value={values.firstName}
            error={errors.firstName}
            onChange={handleChange}
          />
          <Field
            id="lastName"
            label="Apellido"
            value={values.lastName}
            error={errors.lastName}
            onChange={handleChange}
          />
          <Field
            id="email"
            label="Email"
            value={values.email}
            error={errors.email}
            onChange={handleChange}
          />
          <Field
            id="phone"
            label="Telefono"
            value={values.phone}
            error={errors.phone}
            onChange={handleChange}
          />
        </div>
      </section>

      <section className="space-y-5 rounded-[1.5rem] border border-border/75 bg-white/68 px-5 py-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Entrega</p>
          <h3 className="text-xl font-semibold tracking-[0.03em] text-foreground">
            Direccion de envio
          </h3>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.01em] text-foreground">
            Metodo de envio *
          </p>
          <div className="grid gap-3">
            {shippingOptions.map((option) => {
              const isSelected = values.shippingMethod === option.value;

              return (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-[1.2rem] border bg-white/78 px-4 py-4 transition-colors",
                    isSelected
                      ? "border-[var(--color-accent-strong)]/45 bg-[rgba(167,88,60,0.06)]"
                      : "border-border/80 hover:border-foreground/25",
                  )}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleShippingMethodChange(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-start justify-between gap-4">
                    <span className="flex items-start gap-3">
                      <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/25">
                        {isSelected ? (
                          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-strong)]" />
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {option.description}
                        </span>
                      </span>
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {option.cost === 0 ? "Gratis" : formatPrice(option.cost)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          {errors.shippingMethod ? (
            <p className="text-sm leading-6 text-[var(--color-accent-strong)]">
              {errors.shippingMethod}
            </p>
          ) : null}
        </div>

        {isPickupMethod ? (
          <div className="rounded-[1.2rem] border border-border/75 bg-white/78 px-4 py-4 text-sm leading-7 text-muted">
            Podes retirar tu pedido en Resistencia, Chaco. Luego coordinaremos por
            WhatsApp el punto y horario de retiro.
          </div>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          {showAddressField ? (
            <div className="sm:col-span-2">
              <Field
                id="address"
                label="Direccion"
                value={values.address}
                error={errors.address}
                onChange={handleChange}
              />
            </div>
          ) : null}
          {showLocationFields ? (
            <Field
              id="city"
              label="Localidad"
              value={values.city}
              error={errors.city}
              onChange={handleChange}
            />
          ) : null}
          {showLocationFields ? (
            <Field
              id="province"
              label="Provincia"
              value={values.province}
              error={errors.province}
              onChange={handleChange}
            />
          ) : null}
          {showLocationFields ? (
            <Field
              id="postalCode"
              label="Codigo postal"
              value={values.postalCode}
              error={errors.postalCode}
              onChange={handleChange}
            />
          ) : null}
          <div className="sm:col-span-2">
            <Field
              id="notes"
              label="Observaciones"
              value={values.notes}
              error={errors.notes}
              required={false}
              multiline
              onChange={handleChange}
            />
          </div>
        </div>
      </section>

      <div className="space-y-4 rounded-[1.5rem] border border-border/75 bg-white/68 px-5 py-5">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Medio de pago</p>
            <p className="text-sm leading-7 text-muted">
              Elegi como queres dejar preparado el pago de tu orden.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                value: PAYMENT_METHODS.GOCUOTAS,
                title: "GoCuotas",
                description: "Tarjetas en cuotas con checkout externo seguro.",
              },
              ...(isUnicobrosEnabled
                ? [
                    {
                      value: PAYMENT_METHODS.UNICOBROS,
                      title: "Unicobros",
                      description:
                        "Checkout externo seguro con redireccion al proveedor.",
                    },
                  ]
                : []),
              ...(isGetnetEnabled
                ? [{
                    value: PAYMENT_METHODS.GETNET,
                    title: "Getnet",
                    description: "Checkout alojado por Getnet. Redireccion segura sin capturar tarjeta.",
                  }]
                : []),
              {
                value: PAYMENT_METHODS.TRANSFER,
                title: "Transferencia bancaria",
                description: "La orden queda pendiente para coordinar el pago.",
              },
            ].map((option) => {
              const isSelected = values.paymentMethod === option.value;

              return (
                <label
                  key={option.value}
                  className={cn(
                    "cursor-pointer rounded-[1.2rem] border bg-white/78 px-4 py-4 transition-colors",
                    isSelected
                      ? "border-[var(--color-accent-strong)]/45 bg-[rgba(167,88,60,0.06)]"
                      : "border-border/80 hover:border-foreground/25",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handlePaymentMethodChange(option.value)}
                    className="sr-only"
                  />
                  <span className="flex items-start gap-3">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-foreground/25">
                      {isSelected ? (
                        <span className="h-2 w-2 rounded-full bg-[var(--color-accent-strong)]" />
                      ) : null}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Siguiente paso</p>
          <p className="text-sm leading-7 text-muted">
            Primero creamos tu orden y luego preparamos el inicio de pago. Si falta
            algun dato, te lo vamos a indicar aca.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-6 text-sm uppercase tracking-[0.22em] text-white shadow-[0_18px_44px_rgba(167,88,60,0.2)] transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          {isSubmitting ? "Creando orden..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
