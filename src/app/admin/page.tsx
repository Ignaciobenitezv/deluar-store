import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/features/admin/components/admin-logout-button";
import type { BetterAuthSession } from "@/features/admin/better-auth";
import { MobilePrimaryModuleLink, MobileSecondaryModuleLink } from "@/app/admin/admin-home-mobile-cards";
import { formatDashboardNumber, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getDashboardMetrics } from "@/features/admin/dashboard/server/dashboard-service";
import { requireAdminSession } from "@/features/admin/auth";
import { dashboardUi } from "@/features/admin/dashboard/lib/dashboard-ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de administración | DOTCOM",
};

function ArrowRightIcon({ className }: { className?: string } = {}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={cn("h-4 w-4", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4.5 12.5 10 7 15.5" />
    </svg>
  );
}

function CatalogIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn("h-5 w-5", className)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 4 14.5v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5h12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v12" />
    </svg>
  );
}

function OrdersIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn("h-5 w-5", className)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 4.5h8A1.5 1.5 0 0 1 15.5 6v10A1.5 1.5 0 0 1 14 17.5H6A1.5 1.5 0 0 1 4.5 16V6A1.5 1.5 0 0 1 6 4.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h6M7 11h6M7 14h4" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn("h-5 w-5", className)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5V4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15.5h12" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5l2.5-3 2.5 1.8 3.5-5.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5h1.5v1.5" />
    </svg>
  );
}

function ShipmentsIcon({ className }: { className?: string } = {}) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className={cn("h-5 w-5", className)} fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 6.25h13v7.5h-13z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 6.25V4.5h6V6.25" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 10h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 13.75h4" />
    </svg>
  );
}

function getAdminDisplayName(session: BetterAuthSession) {
  const user = session.user as { name?: string | null };
  const name = user.name?.trim();

  if (!name) {
    return "";
  }

  return name.split(/\s+/).filter(Boolean)[0] ?? "";
}

function MobileLogoutButton() {
  return (
    <form action="/api/admin/logout" method="post" className="shrink-0">
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-[12px] border border-white/[0.15] bg-white/[0.10] px-3 text-[12px] font-semibold text-white/90 shadow-[0_8px_16px_rgba(12,18,27,0.14)] backdrop-blur-md transition hover:bg-white/[0.15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        Salir
      </button>
    </form>
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
  tone: {
    surface: string;
    icon: string;
  };
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
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
            badgeTone,
          )}
        >
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
  const [session, metrics] = await Promise.all([requireAdminSession(), getDashboardMetrics("30d")]);
  const displayName = getAdminDisplayName(session);

  const totalProducts = metrics.products.stockDistribution.reduce((accumulator, item) => accumulator + item.products, 0);
  const mobileSnapshot = [
    {
      label: "Stock bajo",
      value: formatDashboardNumber(metrics.summary.lowStockProducts),
      href: "/admin/productos?stock=low",
    },
    {
      label: "Pendientes",
      value: formatDashboardNumber(metrics.alerts.paidPendingPreparationOrders),
      href: "/admin/orders?status=PAID",
    },
    {
      label: "Facturación",
      value: formatDashboardPrice(metrics.summary.billingTotal),
      href: "/admin/dashboard",
    },
  ] as const;

  const cards = [
    {
      href: "/admin/productos",
      title: "Productos",
      description: "Gestioná catálogo, stock, precios e imágenes.",
      cta: "Abrir",
      badge: "Disponible",
      icon: <CatalogIcon />,
      iconTone: "border-white/55 bg-white/45 text-[#314158]",
      badgeTone: "border-sky-200 bg-sky-50 text-sky-900",
      tone: {
        surface: "border-white/70 bg-[linear-gradient(145deg,rgba(214,235,248,0.88),rgba(247,251,255,0.66))]",
        icon: "border-white/55 bg-white/45 text-[#314158]",
        glow: "bg-[radial-gradient(circle_at_74%_18%,rgba(255,255,255,0.5),transparent_58%)]",
      },
    },
    {
      href: "/admin/orders",
      title: "Órdenes",
      description: "Revisá pedidos, pagos y entregas.",
      cta: "Abrir",
      badge: "Disponible",
      icon: <OrdersIcon />,
      iconTone: "border-white/55 bg-white/45 text-[#7d5f39]",
      badgeTone: "border-amber-200 bg-amber-50 text-amber-900",
      tone: {
        surface: "border-white/70 bg-[linear-gradient(145deg,rgba(247,233,214,0.9),rgba(253,248,241,0.68))]",
        icon: "border-white/55 bg-white/45 text-[#7d5f39]",
        glow: "bg-[radial-gradient(circle_at_74%_18%,rgba(255,255,255,0.46),transparent_58%)]",
      },
    },
    {
      href: "/admin/dashboard",
      title: "Estadísticas",
      description: "Ventas y rendimiento del ecommerce.",
      cta: "Ver",
      badge: "Disponible",
      icon: <ChartIcon />,
      iconTone: "border-white/55 bg-white/45 text-[#2f6f52]",
      badgeTone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      tone: {
        surface: "border-white/70 bg-[linear-gradient(145deg,rgba(222,244,236,0.88),rgba(247,251,249,0.66))]",
        icon: "border-white/55 bg-white/45 text-[#2f6f52]",
        glow: "bg-[radial-gradient(circle_at_74%_18%,rgba(255,255,255,0.42),transparent_58%)]",
      },
    },
    {
      href: "/admin/envios",
      title: "Envíos y etiquetas",
      description: "Prepará despachos y descargá archivos.",
      cta: "Ver",
      badge: "Operativo",
      icon: <ShipmentsIcon />,
      iconTone: "border-white/55 bg-white/45 text-[#6f5837]",
      badgeTone: "border-amber-200 bg-amber-50 text-amber-900",
      tone: {
        surface: "border-white/70 bg-[linear-gradient(145deg,rgba(251,226,215,0.88),rgba(254,248,245,0.66))]",
        icon: "border-white/55 bg-white/45 text-[#6f5837]",
        glow: "bg-[radial-gradient(circle_at_74%_18%,rgba(255,255,255,0.4),transparent_58%)]",
      },
    },
  ] as const;

  const mobileTiles = [
    {
      href: "/admin/productos",
      category: "Catálogo",
      title: "Productos",
      value: formatDashboardNumber(totalProducts),
      description: "Stock, precios e imágenes.",
      icon: <CatalogIcon />,
      decorIcon: <CatalogIcon className="h-[118px] w-[118px]" />,
      tone: {
        surface: "border-white/[0.72] bg-[linear-gradient(145deg,rgba(214,235,248,0.96),rgba(245,250,255,0.84))]",
        icon: "border-white/[0.65] bg-white/50 text-[#314158]",
        glow: "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.58),transparent_60%)]",
        decor: "bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.72),transparent_18%),radial-gradient(circle_at_68%_52%,rgba(171,211,235,0.18),transparent_52%)]",
      },
    },
    {
      href: "/admin/orders",
      category: "Operación",
      title: "Órdenes",
      value: formatDashboardNumber(metrics.summary.createdOrders),
      description: "Pedidos, pagos y entregas.",
      icon: <OrdersIcon />,
      decorIcon: <OrdersIcon className="h-[118px] w-[118px]" />,
      tone: {
        surface: "border-white/[0.72] bg-[linear-gradient(145deg,rgba(247,233,214,0.96),rgba(253,248,241,0.84))]",
        icon: "border-white/[0.65] bg-white/50 text-[#7d5f39]",
        glow: "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.5),transparent_60%)]",
        decor: "bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.72),transparent_18%),radial-gradient(circle_at_68%_52%,rgba(214,186,145,0.16),transparent_54%)]",
      },
    },
    {
      href: "/admin/envios",
      category: "Despachos",
      title: "Envíos",
      value: formatDashboardNumber(metrics.shipping.shippingOrders),
      description: "Etiquetas y archivos.",
      icon: <ShipmentsIcon />,
      decorIcon: <ShipmentsIcon className="h-[118px] w-[118px]" />,
      tone: {
        surface: "border-white/[0.72] bg-[linear-gradient(145deg,rgba(251,226,215,0.96),rgba(254,248,245,0.84))]",
        icon: "border-white/[0.65] bg-white/50 text-[#6f5837]",
        glow: "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.48),transparent_60%)]",
        decor: "bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.72),transparent_18%),radial-gradient(circle_at_68%_52%,rgba(236,177,157,0.16),transparent_54%)]",
      },
    },
    {
      href: "/admin/dashboard",
      category: "Rendimiento",
      title: "Estadísticas",
      value: formatDashboardPrice(metrics.summary.billingTotal),
      description: "Ventas y métricas.",
      icon: <ChartIcon />,
      decorIcon: <ChartIcon className="h-[118px] w-[118px]" />,
      tone: {
        surface: "border-white/[0.72] bg-[linear-gradient(145deg,rgba(222,244,236,0.96),rgba(247,251,249,0.84))]",
        icon: "border-white/[0.65] bg-white/50 text-[#2f6f52]",
        glow: "bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.46),transparent_60%)]",
        decor: "bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.72),transparent_18%),radial-gradient(circle_at_68%_52%,rgba(176,222,205,0.16),transparent_54%)]",
      },
    },
  ] as const;

  return (
    <main className={dashboardUi.pageOuter}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-3 pt-3 pb-2.5 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        <div className="relative isolate overflow-hidden lg:hidden bg-[linear-gradient(180deg,rgba(236,236,248,1),rgba(239,240,250,1)_34%,rgba(243,241,251,1)_70%,rgba(246,245,251,1)_100%)]">
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_14%_10%,rgba(171,183,255,0.44),transparent_24%),radial-gradient(circle_at_52%_34%,rgba(130,112,220,0.22),transparent_34%),radial-gradient(circle_at_84%_14%,rgba(233,216,255,0.38),transparent_26%),radial-gradient(circle_at_72%_88%,rgba(180,227,234,0.24),transparent_30%)]" />
          <div className="pointer-events-none absolute left-[-16%] top-[3.2rem] z-0 h-72 w-72 rounded-full bg-[#d5d7ff]/44 blur-[148px]" />
          <div className="pointer-events-none absolute right-[-12%] top-[10rem] z-0 h-56 w-56 rounded-full bg-[#ead9ff]/38 blur-[138px]" />
          <div className="pointer-events-none absolute left-[8%] top-[16.4rem] z-0 h-64 w-64 rounded-full bg-[#9aa8ff]/22 blur-[160px]" />
          <div className="pointer-events-none absolute right-[12%] top-[18.8rem] z-0 h-56 w-56 rounded-full bg-[#f4cfa9]/18 blur-[150px]" />
          <div className="pointer-events-none absolute bottom-[-5rem] left-[14%] z-0 h-72 w-72 rounded-full bg-[#d8f0ec]/24 blur-[150px]" />
          <div className="pointer-events-none absolute bottom-[7rem] right-[-10%] z-0 h-72 w-72 rounded-full bg-[#dce6ff]/26 blur-[160px]" />
          <div className="pointer-events-none absolute inset-x-[-10%] top-[12.4rem] z-0 h-56 bg-[radial-gradient(circle_at_24%_50%,rgba(99,122,255,0.20),transparent_34%),radial-gradient(circle_at_52%_48%,rgba(124,94,224,0.18),transparent_38%),radial-gradient(circle_at_82%_36%,rgba(96,178,240,0.12),transparent_38%)] blur-[120px]" />

          <div className="relative z-10 space-y-4">
            <section className="relative overflow-hidden rounded-[36px] border border-white/[0.12] bg-[linear-gradient(160deg,rgba(55,71,94,0.99),rgba(43,58,80,0.97)_56%,rgba(36,48,67,0.99))] p-4 text-white shadow-[0_22px_48px_rgba(25,34,48,0.22)] backdrop-blur-[8px]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(214,235,248,0.16),transparent_32%),radial-gradient(circle_at_12%_84%,rgba(245,223,193,0.14),transparent_34%)]" />
              <div className="pointer-events-none absolute inset-x-[-10%] top-[-12%] h-24 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_72%)] blur-3xl" />
              <div className="pointer-events-none absolute right-[-12px] top-3 h-28 w-44 opacity-60">
                <svg aria-hidden="true" viewBox="0 0 176 120" className="h-full w-full" fill="none">
                  <path
                    d="M18 84C43 48 66 36 91 40C118 44 127 92 157 54"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M18 66C48 28 81 28 108 45C132 60 145 82 158 40"
                    stroke="rgba(214,235,248,0.24)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx="18" cy="84" r="4.8" fill="rgba(245,223,193,0.55)" />
                  <circle cx="91" cy="40" r="4" fill="rgba(214,235,248,0.62)" />
                  <circle cx="157" cy="54" r="4.2" fill="rgba(222,244,236,0.55)" />
                </svg>
              </div>

              <div className="pointer-events-none absolute inset-x-[-6%] bottom-[-2px] h-24">
                <svg aria-hidden="true" viewBox="0 0 390 98" className="h-full w-full" fill="none">
                  <path d="M0 60C44 38 84 30 126 34C171 38 191 73 231 72C271 71 292 44 329 39C352 36 372 42 390 50V98H0V60Z" fill="rgba(123,141,229,0.46)" />
                  <path d="M0 72C38 58 85 51 126 55C166 59 191 84 232 82C275 80 298 54 332 49C354 46 374 49 390 56V98H0V72Z" fill="rgba(88,101,196,0.36)" />
                </svg>
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/[0.68]">Deluar · Admin</p>
                  <h1 className="mt-3 text-[1.6rem] font-semibold tracking-[-0.055em] text-white">
                    {displayName ? `Buenas, ${displayName}` : "Panel de administración"}
                  </h1>
                  <p className="mt-2 text-[13px] leading-5 text-white/[0.78]">¿Qué querés gestionar hoy?</p>
                </div>

                <MobileLogoutButton />
              </div>

              <div className="relative mt-4 grid grid-cols-3 gap-1.5">
                {mobileSnapshot.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="rounded-[18px] border border-white/[0.08] bg-white/[0.06] px-3 py-2.5 backdrop-blur-sm transition hover:border-white/[0.14] hover:bg-white/[0.10] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent"
                  >
                    <p className="whitespace-nowrap text-[12px] font-semibold tracking-[-0.03em] text-white">
                      {item.value}
                    </p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/[0.62]">
                      {item.label}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <MobilePrimaryModuleLink {...mobileTiles[0]} />
              <MobilePrimaryModuleLink {...mobileTiles[1]} />
              <MobileSecondaryModuleLink {...mobileTiles[2]} />
              <MobileSecondaryModuleLink {...mobileTiles[3]} />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-[-8%] bottom-[-2rem] z-0 h-80 bg-[radial-gradient(circle_at_28%_14%,rgba(132,110,220,0.22),transparent_34%),radial-gradient(circle_at_70%_30%,rgba(107,194,220,0.16),transparent_32%),radial-gradient(circle_at_54%_66%,rgba(224,191,150,0.12),transparent_38%)] blur-[120px]" />
        </div>

        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden lg:flex">
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

              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
