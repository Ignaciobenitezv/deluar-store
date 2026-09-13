import Link from "next/link";
import { displaySerif } from "./home-fonts";
import {
  IconCustomers,
  IconOrders,
  IconProducts,
  IconShipping,
  IconStats,
} from "./home-icons";
import { glass } from "./home-ui";
import { cn } from "@/lib/utils";

function IconHome({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.6 10.2 12 3.6l8.4 6.6v9a1.6 1.6 0 0 1-1.6 1.6H5.2a1.6 1.6 0 0 1-1.6-1.6v-9Z" />
      <path d="M9.4 20.8v-7h5.2v7" />
    </svg>
  );
}

function IconExternal({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4.6h5.4V10M19.4 4.6 11 13" />
      <path d="M18.2 14v5.4a1.4 1.4 0 0 1-1.4 1.4H5.2a1.4 1.4 0 0 1-1.4-1.4V7.6a1.4 1.4 0 0 1 1.4-1.4H10" />
    </svg>
  );
}

function IconContent({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.4" y="3.8" width="15.2" height="16.4" rx="2" />
      <path d="M8 8.4h8M8 12h8M8 15.6h4.6" />
    </svg>
  );
}

function IconLogout({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20.2H5.6a1.6 1.6 0 0 1-1.6-1.6V5.4a1.6 1.6 0 0 1 1.6-1.6H10" />
      <path d="M15.6 16.2 20 12l-4.4-4.2M20 12H9.2" />
    </svg>
  );
}

/** Every destination here resolves; nothing is listed that does not exist. */
const PRIMARY = [
  { href: "/admin", label: "Inicio", icon: <IconHome />, current: true },
  { href: "/admin/productos", label: "Productos", icon: <IconProducts className="h-[18px] w-[18px]" /> },
  { href: "/admin/orders", label: "Órdenes", icon: <IconOrders className="h-[18px] w-[18px]" /> },
  { href: "/admin/dashboard", label: "Estadísticas", icon: <IconStats className="h-[18px] w-[18px]" /> },
  { href: "/admin/envios", label: "Envíos", icon: <IconShipping className="h-[18px] w-[18px]" /> },
  { href: "/admin/dashboard/clientes", label: "Clientes", icon: <IconCustomers className="h-[18px] w-[18px]" /> },
];

function NavItem({
  href,
  label,
  icon,
  current,
  external,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  current?: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-3.5 py-[9px] text-[14px] transition-colors",
        current
          ? "bg-white/80 font-medium text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_2px_rgba(30,41,59,0.06)]"
          : "text-slate-600 hover:bg-white/40 hover:text-slate-900",
      )}
    >
      <span aria-hidden className={current ? "text-slate-700" : "text-slate-400"}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

const RULE = "my-5 h-px bg-slate-900/[0.06]";

/**
 * The Admin's own rail. It lives inside this page rather than in a layout: the
 * four module routes each ship their own sidebar already, and a parent layout
 * would stack a second one on top of them.
 */
export function HomeSidebar({ displayName }: { displayName: string }) {
  const initial = (displayName || "A").charAt(0).toUpperCase();

  return (
    <aside className={cn(glass.shell, "flex w-[232px] shrink-0 flex-col rounded-[18px] px-4 pb-6 pt-7")}>
      <div className="px-3.5">
        <p className={cn(displaySerif.className, "text-[27px] leading-none text-slate-950")}>
          Deluar
        </p>
        <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Admin
        </p>
      </div>

      <div className={cn(RULE, "mt-6")} />

      <nav className="flex flex-col gap-0.5">
        {PRIMARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className={RULE} />

      <p className="px-3.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Configuración
      </p>
      <nav className="mt-3 flex flex-col gap-0.5">
        <NavItem href="/" label="Ver tienda" icon={<IconExternal />} external />
        <NavItem href="/studio" label="Contenido" icon={<IconContent />} external />
      </nav>

      <div className="mt-auto">
        <div className={RULE} />

        <div className="flex items-center gap-3 px-3.5">
          <span
            aria-hidden
            className={cn(
              displaySerif.className,
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 text-[16px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]",
            )}
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-slate-900">
              {displayName || "Administración"}
            </span>
            <span className="block truncate text-[11.5px] text-slate-600">Administradora</span>
          </span>
        </div>

        <form action="/api/admin/logout" method="post" className="mt-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-[10px] px-3.5 py-[9px] text-[14px] text-slate-600 transition-colors hover:bg-white/55 hover:text-slate-900"
          >
            <span aria-hidden className="text-slate-400">
              <IconLogout />
            </span>
            Cerrar sesión
          </button>
        </form>

        <div className={RULE} />

        <p className={cn(displaySerif.className, "px-3.5 text-[12.5px] italic leading-[1.5] text-slate-500")}>
          &ldquo;Una tienda m&aacute;s cerca de las personas.&rdquo;
        </p>
      </div>
    </aside>
  );
}
