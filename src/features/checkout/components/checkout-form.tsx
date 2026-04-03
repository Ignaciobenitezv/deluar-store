"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { CheckoutFormErrors, CheckoutFormValues } from "@/features/checkout/types";
import {
  getInitialCheckoutFormValues,
  validateCheckoutForm,
} from "@/features/checkout/validation";

type CheckoutFormProps = {
  onSubmit: (values: CheckoutFormValues) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
};

type FieldProps = {
  id: keyof CheckoutFormValues;
  label: string;
  value: string;
  error?: string;
  required?: boolean;
  multiline?: boolean;
  onChange: (field: keyof CheckoutFormValues, value: string) => void;
};

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
  isSubmitting = false,
  submitLabel = "Continuar al pago",
}: CheckoutFormProps) {
  const [values, setValues] = useState<CheckoutFormValues>(getInitialCheckoutFormValues);
  const [errors, setErrors] = useState<CheckoutFormErrors>({});

  const handleChange = (field: keyof CheckoutFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field
              id="address"
              label="Direccion"
              value={values.address}
              error={errors.address}
              onChange={handleChange}
            />
          </div>
          <Field
            id="city"
            label="Localidad"
            value={values.city}
            error={errors.city}
            onChange={handleChange}
          />
          <Field
            id="province"
            label="Provincia"
            value={values.province}
            error={errors.province}
            onChange={handleChange}
          />
          <Field
            id="postalCode"
            label="Codigo postal"
            value={values.postalCode}
            error={errors.postalCode}
            onChange={handleChange}
          />
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
