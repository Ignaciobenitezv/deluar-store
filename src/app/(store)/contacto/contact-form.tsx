"use client";

import { useState, type FormEvent } from "react";

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

type ContactFormErrors = Partial<Record<keyof ContactFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,25}$/;

const initialState: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function isBlank(value: string) {
  return value.trim().length === 0;
}

function validate(values: ContactFormState) {
  const errors: ContactFormErrors = {};

  if (isBlank(values.name)) {
    errors.name = "Ingresá tu nombre.";
  }

  if (isBlank(values.email)) {
    errors.email = "Ingresá tu email.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }

  if (values.phone.trim() && !PHONE_PATTERN.test(values.phone.trim())) {
    errors.phone = "Ingresá un teléfono válido.";
  }

  if (isBlank(values.message)) {
    errors.message = "Escribí tu mensaje.";
  }

  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<ContactFormState>(initialState);
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const handleChange = (field: keyof ContactFormState, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSuccessMessage("");
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setSubmitError("");

    const nextErrors = validate(values);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          message: values.message.trim(),
        }),
      });

      const result = (await response.json()) as
        | { ok: true }
        | { ok: false; errors?: string[] };

      if (!response.ok || !result.ok) {
        throw new Error(
          !response.ok && "errors" in result && result.errors?.length
            ? result.errors.join(" ")
            : "No se pudo enviar el mensaje.",
        );
      }

      setValues(initialState);
      setErrors({});
      setSuccessMessage("Mensaje enviado correctamente.");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "No se pudo enviar el mensaje.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          htmlFor="nombre"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          value={values.name}
          onChange={(event) => handleChange("name", event.target.value)}
          className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
        />
        {errors.name ? <p className="mt-1.5 text-xs text-[var(--color-accent-strong)]">{errors.name}</p> : null}
      </div>

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={values.email}
          onChange={(event) => handleChange("email", event.target.value)}
          className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
        />
        {errors.email ? <p className="mt-1.5 text-xs text-[var(--color-accent-strong)]">{errors.email}</p> : null}
      </div>

      <div>
        <label
          htmlFor="telefono"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          Teléfono <span className="font-normal normal-case tracking-normal text-muted">(Opcional)</span>
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          value={values.phone}
          onChange={(event) => handleChange("phone", event.target.value)}
          className="w-full rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
        />
        {errors.phone ? <p className="mt-1.5 text-xs text-[var(--color-accent-strong)]">{errors.phone}</p> : null}
      </div>

      <div>
        <label
          htmlFor="mensaje"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-foreground"
        >
          Mensaje <span className="font-normal normal-case tracking-normal text-muted">(Obligatorio)</span>
        </label>
        <textarea
          id="mensaje"
          name="mensaje"
          rows={5}
          required
          value={values.message}
          onChange={(event) => handleChange("message", event.target.value)}
          className="w-full resize-none rounded border border-[#d8cfc4] bg-[#e8ddd3] px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-[#b69272] transition-colors"
        />
        {errors.message ? <p className="mt-1.5 text-xs text-[var(--color-accent-strong)]">{errors.message}</p> : null}
      </div>

      <div className="space-y-2" aria-live="polite">
        {isSubmitting ? (
          <p className="text-sm font-medium text-foreground">Enviando...</p>
        ) : null}
        {successMessage ? (
          <p className="text-sm font-medium text-emerald-700">{successMessage}</p>
        ) : null}
        {submitError ? <p className="text-sm font-medium text-[var(--color-accent-strong)]">{submitError}</p> : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
