import { jsonError, jsonSuccess } from "@/lib/http";
import { env } from "@/lib/env";
import { hasEmailConfig, sendEmail } from "@/integrations/email/resend";
import { renderContactMessageEmail } from "@/features/emails/templates/contact-message";
import { logger } from "@/lib/logger";
import { isSameOriginRequest } from "@/lib/request-security";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[\d\s()+-]{6,25}$/;

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validatePayload(payload: ContactPayload) {
  const name = readString(payload.name);
  const email = readString(payload.email);
  const phone = readString(payload.phone);
  const message = readString(payload.message);
  const errors: string[] = [];

  if (!name) {
    errors.push("Ingresá tu nombre.");
  }

  if (!email) {
    errors.push("Ingresá tu email.");
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.push("Ingresá un email válido.");
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    errors.push("Ingresá un teléfono válido.");
  }

  if (!message) {
    errors.push("Escribí tu mensaje.");
  }

  return {
    errors,
    values: {
      name,
      email,
      phone,
      message,
    },
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!isSameOriginRequest(request)) {
      logger.warn("api.contact.invalid_origin", { requestId });
      return jsonError(["Solicitud no permitida."], 403, { requestId });
    }

    const payload = (await request.json()) as ContactPayload;
    const { errors, values } = validatePayload(payload);

    if (errors.length > 0) {
      return jsonError(errors, 400, { requestId });
    }

    if (!hasEmailConfig() || !env.emailAdminTo) {
      logger.warn("api.contact.config_missing", { requestId });
      return jsonError(["El formulario de contacto no está configurado."], 503, {
        requestId,
      });
    }

    const subject = `Nuevo mensaje de contacto - ${values.name}`;
    const html = renderContactMessageEmail(values);

    await sendEmail({
      to: env.emailAdminTo,
      subject,
      html,
      replyTo: values.email,
    });

    return jsonSuccess(
      {
        ok: true,
      },
      200,
      { requestId },
    );
  } catch (error) {
    logger.error("api.contact.failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown_error",
    });

    return jsonError(["No se pudo enviar el mensaje. Intenta nuevamente."], 500, {
      requestId,
    });
  }
}
