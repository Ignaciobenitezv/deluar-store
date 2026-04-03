import type { HomeInstitutional } from "@/features/home/types";

type HomeInstitutionalProps = {
  institutional: HomeInstitutional;
};

export function HomeInstitutional({ institutional }: HomeInstitutionalProps) {
  return (
    <section className="grid gap-6 rounded-[2rem] border border-border/80 bg-surface/92 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Sobre DELUAR</p>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-[0.03em] text-foreground">
          {institutional.title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-muted sm:text-base">
          {institutional.text}
        </p>
      </div>

      <div className="space-y-3 rounded-[1.5rem] border border-border/75 bg-white/72 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">Contacto</p>
        {institutional.contactEmail ? (
          <p className="text-sm leading-7 text-foreground">{institutional.contactEmail}</p>
        ) : null}
        {institutional.whatsappNumber ? (
          <p className="text-sm leading-7 text-foreground">{institutional.whatsappNumber}</p>
        ) : null}
        {!institutional.contactEmail && !institutional.whatsappNumber ? (
          <p className="text-sm leading-7 text-muted">
            Puedes completar los datos de contacto desde la configuracion del sitio en
            Sanity.
          </p>
        ) : null}
      </div>
    </section>
  );
}
