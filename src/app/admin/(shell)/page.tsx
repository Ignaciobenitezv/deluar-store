import type { Metadata } from "next";
import type { BetterAuthSession } from "@/features/admin/better-auth";
import { formatDashboardNumber, formatDashboardPrice } from "@/features/admin/dashboard/lib/dashboard-formatters";
import { getDashboardMetrics } from "@/features/admin/dashboard/server/dashboard-service";
import { requireAdminSession } from "@/features/admin/auth";
import {
  HomeKpi,
  HomeModule,
  HomeModuleCard,
  HomeSectionTitle,
} from "@/features/admin/home/components/home-modules";
import { HomeHero } from "@/features/admin/home/components/home-hero";
import motion from "@/features/admin/home/components/home-motion.module.css";
import { QuickActions, RecentOrders, StorefrontBanner } from "@/features/admin/home/components/home-panels";
import { moduleTone } from "@/features/admin/home/components/home-ui";
import {
  IconBolt,
  IconClock,
  IconCustomers,
  IconOrders,
  IconPlus,
  IconProducts,
  IconSales,
  IconShipping,
  IconStats,
  IconStock,
  IconTag,
} from "@/features/admin/home/components/home-icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel de administración | DOTCOM",
};

function getAdminDisplayName(session: BetterAuthSession) {
  const user = session.user as { name?: string | null };
  const name = user.name?.trim();

  if (!name) {
    return "";
  }

  return name.split(/\s+/).filter(Boolean)[0] ?? "";
}

const kpiIconClass = "h-[15px] w-[15px]";

export default async function AdminHomePage() {
  const [session, metrics] = await Promise.all([requireAdminSession(), getDashboardMetrics("30d")]);
  const displayName = getAdminDisplayName(session);
  const now = new Date();
  const activeProducts = metrics.products.catalog.filter((product) => product.isActive).length;
  /** The real comparison, including its absence: stock and unique buyers have
      no previous window in the service, so those two stay unmeasurable. */
  const toDelta = (source?: { direction: "up" | "down" | "flat" | "unmeasurable"; changePercent: number | null }) => ({
    direction: source?.direction ?? ("unmeasurable" as const),
    changePercent: Math.abs(source?.changePercent ?? 0),
  });
  const unmeasured = { direction: "unmeasurable" as const, changePercent: 0 };

  const totalProducts = metrics.products.stockDistribution.reduce((accumulator, item) => accumulator + item.products, 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
        <div className={cn(motion.rise, "space-y-5")}>
          <HomeHero displayName={displayName} />

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <HomeKpi
              label="Ventas (30 días)"
              icon={<IconSales className={kpiIconClass} />}
              tone={moduleTone.stats}
              value={formatDashboardPrice(metrics.summary.billingTotal)}
              delta={toDelta(metrics.comparison.billingTotal)}
              context="vs. período anterior"
              href="/admin/dashboard/ventas"
            />
            <HomeKpi
              label="Pedidos (30 días)"
              icon={<IconOrders className={kpiIconClass} />}
              tone={moduleTone.orders}
              value={formatDashboardNumber(metrics.summary.createdOrders)}
              delta={toDelta(metrics.comparison.paidOrders)}
              context="vs. período anterior"
              href="/admin/orders"
            />
            <HomeKpi
              label="Clientes (30 días)"
              icon={<IconCustomers className={kpiIconClass} />}
              tone={moduleTone.customers}
              value={formatDashboardNumber(metrics.customers.uniqueCustomers)}
              delta={unmeasured}
              context={`${formatDashboardNumber(metrics.customers.newCustomers)} nuevos en el período`}
              href="/admin/dashboard/clientes"
            />
            <HomeKpi
              label="Productos activos"
              icon={<IconProducts className={kpiIconClass} />}
              tone={moduleTone.products}
              value={formatDashboardNumber(activeProducts)}
              delta={unmeasured}
              context={`de ${formatDashboardNumber(totalProducts)} en el catálogo`}
              href="/admin/productos"
            />
          </div>

          <div>
            <HomeSectionTitle title="Módulos" note="Accedé rápidamente a las secciones más importantes del Admin." />
            <div className="mt-2.5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
              <HomeModuleCard
                href="/admin/productos"
                title="Productos"
                description="Gestioná catálogo, stock, precios e imágenes."
                cta="Abrir"
                icon={<IconProducts />}
                tone={moduleTone.products}
                alert={
                  metrics.summary.lowStockProducts > 0
                    ? { label: `${formatDashboardNumber(metrics.summary.lowStockProducts)} con stock bajo` }
                    : null
                }
              />
              <HomeModuleCard
                href="/admin/orders"
                title="Órdenes"
                description="Revisá pedidos, pagos y entregas."
                cta="Abrir"
                icon={<IconOrders />}
                tone={moduleTone.orders}
                alert={
                  metrics.alerts.paidPendingPreparationOrders > 0
                    ? { label: `${formatDashboardNumber(metrics.alerts.paidPendingPreparationOrders)} por preparar` }
                    : null
                }
              />
              <HomeModuleCard
                href="/admin/dashboard"
                title="Estadísticas"
                description="Ventas y rendimiento del ecommerce."
                cta="Ver"
                icon={<IconStats />}
                tone={moduleTone.stats}
              />
              <HomeModuleCard
                href="/admin/envios"
                title="Envíos y etiquetas"
                description="Prepará despachos y descargá archivos."
                cta="Ver"
                icon={<IconShipping />}
                tone={moduleTone.shipping}
              />
              <HomeModuleCard
                href="/admin/dashboard/clientes"
                title="Clientes"
                description="Conocé a tus clientes y su comportamiento."
                cta="Ver"
                icon={<IconCustomers />}
                tone={moduleTone.customers}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <HomeModule
              title="Pedidos recientes"
              note="Últimos pedidos registrados en tu tienda."
              icon={<IconClock />}
              action={{ href: "/admin/orders", label: "Ver todos" }}
            >
              <RecentOrders orders={metrics.ledger.orders.slice(0, 5)} now={now} />
            </HomeModule>

            <HomeModule title="Atajos útiles" note="Accedé rápidamente a tareas frecuentes." icon={<IconBolt />}>
              <QuickActions
                actions={[
                  { href: "/admin/productos", label: "Crear producto", icon: <IconPlus /> },
                  { href: "/admin/productos?stock=low", label: "Gestionar stock", icon: <IconStock /> },
                  { href: "/admin/orders?status=PAID", label: "Ver pedidos pendientes", icon: <IconOrders className="h-[17px] w-[17px]" /> },
                  { href: "/admin/envios", label: "Descargar etiquetas", icon: <IconTag /> },
                ]}
              />
              <StorefrontBanner />
            </HomeModule>
          </div>
        </div>
      </div>
    </main>
  );
}
