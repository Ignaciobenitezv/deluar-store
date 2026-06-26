const WHATSAPP_URL =
  "https://wa.me/5493644448683?text=Hola%2C%20vengo%20de%20la%20pagina%21%20Quer%C3%ADa%20hacer%20una%20consulta.";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.52 3.49A11.87 11.87 0 0 0 12.08 0C5.51 0 .16 5.35.16 11.93c0 2.1.55 4.16 1.6 5.97L.06 24l6.24-1.64a11.9 11.9 0 0 0 5.77 1.47h.01c6.58 0 11.93-5.35 11.93-11.93 0-3.19-1.24-6.18-3.49-8.41Zm-8.44 18.32h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.7.97.99-3.61-.23-.37a9.87 9.87 0 0 1-1.51-5.28c0-5.46 4.44-9.91 9.91-9.91a9.84 9.84 0 0 1 7 2.9 9.85 9.85 0 0 1 2.9 7.01c-.01 5.46-4.46 9.88-9.95 9.88Zm5.44-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

export function WhatsAppFloatingButton() {
  return (
    <>
      <a
        aria-label="Consultar por WhatsApp"
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-50 hidden items-center gap-2 rounded-full border border-white/20 bg-[#f1dcc7] px-4 py-3 text-sm font-medium text-[#f8f4ef] shadow-[0_18px_42px_rgba(58,42,34,0.34)] ring-1 ring-black/5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#ead0b3] hover:shadow-[0_22px_52px_rgba(58,42,34,0.40)] md:flex"
        href={WHATSAPP_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <WhatsAppIcon className="h-5 w-5" />
        <span>¿Necesitas ayuda?</span>
      </a>
      <a
        aria-label="Consultar por WhatsApp"
        className="fixed bottom-[calc(2.875rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#f1dcc7] text-[#f8f4ef] shadow-[0_12px_28px_rgba(58,42,34,0.28)] ring-1 ring-black/5 backdrop-blur-sm md:hidden"
        href={WHATSAPP_URL}
        rel="noopener noreferrer"
        target="_blank"
      >
        <WhatsAppIcon className="h-[1.05rem] w-[1.05rem]" />
      </a>
    </>
  );
}
