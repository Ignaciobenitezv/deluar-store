import { escapeHtml, renderEmailLayout } from "@/features/emails/templates/shared";

type RenderContactMessageEmailInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export function renderContactMessageEmail(input: RenderContactMessageEmailInput) {
  return renderEmailLayout({
    title: `Nuevo mensaje de contacto - ${input.name}`,
    preview: `Mensaje de ${input.name} (${input.email}).`,
    children: `
      <h1 style="margin:0 0 12px;color:#2f241f;font-size:24px;line-height:1.25;">Nuevo mensaje de contacto</h1>
      <p style="margin:0 0 18px;color:#5f4b42;font-size:15px;line-height:1.6;">
        Recibiste una nueva consulta desde el formulario de contacto de DELUAR.
      </p>
      <div style="background:#fbf8f5;border:1px solid #eadfd7;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:14px;line-height:1.7;color:#2f241f;">
          <div><strong>Nombre:</strong> ${escapeHtml(input.name)}</div>
          <div><strong>Email:</strong> ${escapeHtml(input.email)}</div>
          ${input.phone ? `<div><strong>Teléfono:</strong> ${escapeHtml(input.phone)}</div>` : ""}
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid #eadfd7;border-radius:12px;padding:16px;margin:20px 0;">
        <div style="font-size:14px;line-height:1.8;color:#2f241f;white-space:pre-wrap;">${escapeHtml(input.message)}</div>
      </div>
    `,
  });
}
