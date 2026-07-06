import { Resend } from "resend";
import { env } from "@/lib/env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }

  return resendClient;
}

export function hasEmailConfig() {
  return Boolean(env.resendApiKey && env.emailFrom);
}

export async function sendEmail(input: SendEmailInput) {
  if (!hasEmailConfig()) {
    throw new Error("Resend no esta configurado: faltan RESEND_API_KEY o EMAIL_FROM.");
  }

  const response = await getResendClient().emails.send({
    from: env.emailFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    providerMessageId: response.data?.id,
  };
}
