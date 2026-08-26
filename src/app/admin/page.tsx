import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/features/admin/components/admin-logout-button";
import { requireAdminSession } from "@/features/admin/auth";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de administración | DOTCOM",
};

function ArrowRightIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.5 12.5 10 7 15.5" />
    </svg>
  );
}

function CatalogIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5h12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v12" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h8A1.5 1.5 0 0 1 15.5 6v10A1.5 1.5 0 0 1 14 17.5H6A1.5 1.5 0 0 1 4.5 16V6A1.5 1.5 0 0 1 6 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h6M7 11h6M7 14h4" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5V4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5h12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5l2.5-3 2.5 1.8 3.5-5.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5h1.5v1.5" />
    </svg>
  );
}

type HubCardProps = {
  href: string;
  title: string;
  description: string;
  cta: string;
  badge: string;
  icon: ReactNode;
  iconTone: string;
  badgeTone: string;
};

function HubCard({ href, title, description, cta, badge, icon, iconTone, badgeTone }: HubCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full min-h-[260px] flex-col justify-between rounded-[28px] border border-[#e8ddd0] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#dbcdbd] hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)] sm:p-6",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl border", iconTone)}>{icon}</div>
        <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", badgeTone)}>
          {badge}
        </span>
      </div>

      <div className="mt-5">
        <h2 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#314158] transition group-hover:translate-x-0.5">
        <span>{cta}</span>
        <ArrowRightIcon />
      </div>
    </Link>
  );
}

export default async function AdminHomePage() {
  await requireAdminSession();

  const cards = [
    {
      href: "/admin/productos",
      title: "Productos",
      description: "Gestioná catálogo, stock, precios, imágenes y visibilidad desde un solo lugar.",
      cta: "Ir a productos",
      badge: "Disponible",
      icon: <CatalogIcon />,
      iconTone: "border-[#d7e0ea] bg-[#eef3f8] text-[#314158]",
      badgeTone: "border-sky-200 bg-sky-50 text-sky-900",
    },
    {
      href: "/admin/orders",
      title: "Órdenes",
      description: "Revisá pedidos, pagos, envíos y estados operativos con acceso rápido.",
      cta: "Ver órdenes",
      badge: "Disponible",
      icon: <OrdersIcon />,
      iconTone: "border-[#e9dfcf] bg-[#f7f3eb] text-[#7d5f39]",
      badgeTone: "border-amber-200 bg-amber-50 text-amber-900",
    },
    {
      href: "/admin/dashboard",
      title: "Estadísticas",
      description: "Analizá ventas, facturación y rendimiento del ecommerce.",
      cta: "Ver estadísticas",
      badge: "Disponible",
      icon: <ChartIcon />,
      iconTone: "border-[#d8eadf] bg-[#eef8f3] text-[#2f6f52]",
      badgeTone: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
  ] as const;

  return (
    <main className={dashboardUi.pageOuter}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className={`${dashboardUi.shell} flex min-h-0 flex-1 flex-col overflow-hidden`}>
          <div className={`${dashboardUi.contentPadding} flex min-h-0 flex-1 flex-col`}>
            <div className={dashboardUi.shellInner}>
              <header className="rounded-[24px] border border-slate-200/70 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0 max-w-3xl">
                    <p className={dashboardUi.mutedLabel}>Panel de administración</p>
                    <h1 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.05em] text-slate-950 sm:mt-4 sm:text-[2.35rem]">
                      Elegí el área que querés gestionar
                    </h1>
                    <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500 sm:text-base sm:leading-7">
                      Acceso rápido a los módulos principales del Admin. Usá esta pantalla como punto de entrada para
                      catálogo, órdenes y análisis.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={dashboardUi.pill}>Acceso rápido</span>
                    <span className={dashboardUi.pill}>Navegación principal</span>
                    <AdminLogoutButton className="sm:ml-2" />
                  </div>
                </div>
              </header>

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <HubCard key={card.href} {...card} />
                ))}
              </section>

              <section className={dashboardUi.card}>
                <div className={dashboardUi.cardBody}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className={dashboardUi.mutedLabel}>Atajos</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Desde el hub también podés entrar a resúmenes, reportes y vistas operativas ya disponibles.
                      </p>
                    </div>
                    <Link
                      href="/admin/dashboard"
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold",
                        dashboardUi.softAction,
                      )}
                    >
                      Ir al resumen
                      <ArrowRightIcon />
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
