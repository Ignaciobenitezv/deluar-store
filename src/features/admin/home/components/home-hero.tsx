/** Compact product header — the date already lives in the topbar, so this
 * only names the page and, secondarily, greets the user. Not an editorial
 * hero: one line of heading, one line of subtitle. */
export function HomeHero({ displayName }: { displayName: string }) {
  return (
    <div className="min-w-0">
      <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-text-primary">Inicio</h1>
      <p className="mt-1 text-[13px] text-text-secondary">
        Resumen general de tu tienda{displayName ? ` — Hola, ${displayName}` : ""}
      </p>
    </div>
  );
}
