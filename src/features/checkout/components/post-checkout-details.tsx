import type { PostCheckoutContext } from "@/features/checkout/post-checkout-context";

type PostCheckoutDetailsProps = {
  context: PostCheckoutContext;
  title: string;
  description: string;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-xs uppercase tracking-[0.18em] text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function PostCheckoutDetails({
  context,
  title,
  description,
}: PostCheckoutDetailsProps) {
  const rows = [
    context.status ? { label: "Estado", value: context.status } : null,
    context.type ? { label: "Tipo", value: context.type } : null,
    context.transactionId ? { label: "Transacción", value: context.transactionId } : null,
    context.orderNumber ? { label: "Orden", value: context.orderNumber } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <section className="space-y-3 rounded-[1.25rem] border border-border/75 bg-white/72 px-4 py-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.24em] text-muted">Retorno</p>
        <h2 className="text-lg font-semibold tracking-[0.02em] text-foreground">{title}</h2>
        <p className="text-sm leading-6 text-muted">{description}</p>
      </div>

      {rows.length > 0 ? (
        <div className="pt-1">
          {rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      ) : (
        <p className="pt-1 text-sm leading-6 text-muted">
          No se recibieron parámetros extra en la URL.
        </p>
      )}
    </section>
  );
}
