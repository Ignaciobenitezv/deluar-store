import { IconCalendar } from "./home-icons";
import { displaySerif } from "./home-fonts";
import { glass } from "./home-ui";
import { cn } from "@/lib/utils";

/**
 * The greeting band. No photograph of its own: the drawn ground already runs
 * behind the whole shell, and the pane simply lets it through.
 */
export function HomeHero({
  displayName,
  dateLabel,
}: {
  displayName: string;
  dateLabel: string;
}) {
  return (
    <section className={cn(glass.panel, "rounded-[16px] px-8 py-7")}>
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Panel de administración
          </p>
          <h1
            className={cn(
              displaySerif.className,
              "mt-3 text-[2.3rem] font-medium leading-[1.05] tracking-[-0.02em] text-slate-950",
            )}
          >
            Hola, {displayName || "de nuevo"}
          </h1>
          <p className="mt-3 text-[15px] leading-[1.5] text-slate-600">
            Todo lo que necesitás para gestionar tu tienda en un solo lugar.
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-4">
          <span className="inline-flex items-center gap-2 text-[13.5px] text-slate-600">
            <IconCalendar className="h-[15px] w-[15px] text-slate-400" />
            {dateLabel}
          </span>

          <p className="max-w-[30ch] rounded-[10px] border border-white/50 bg-white/35 px-4 py-3 text-right text-[13px] italic leading-[1.55] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-sm">
            &ldquo;Buenas decisiones hoy,
            <br />
            una tienda m&aacute;s grande ma&ntilde;ana.&rdquo;
          </p>
        </div>
      </div>
    </section>
  );
}
