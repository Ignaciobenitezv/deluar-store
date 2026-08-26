import { getAcquisitionAnalyticsPageData } from "@/features/admin/analytics/server/acquisition-analytics-service";
import { getConversionAnalyticsMetrics } from "@/features/admin/analytics/server/conversion-analytics-service";
import { getCustomerAnalyticsPageData } from "@/features/admin/analytics/server/customer-analytics-service";
import { getProductAnalyticsPageData } from "@/features/admin/analytics/server/product-analytics-service";
import { getDashboardMetrics, type DashboardPeriod } from "@/features/admin/dashboard/server/dashboard-service";

export type ExecutiveSummaryInsight = {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "accent";
};

export type ExecutiveSummaryPageData = {
  period: DashboardPeriod;
  dashboard: Awaited<ReturnType<typeof getDashboardMetrics>>;
  conversion: Awaited<ReturnType<typeof getConversionAnalyticsMetrics>>;
  acquisition: Awaited<ReturnType<typeof getAcquisitionAnalyticsPageData>>;
  customers: Awaited<ReturnType<typeof getCustomerAnalyticsPageData>>;
  products: Awaited<ReturnType<typeof getProductAnalyticsPageData>>;
  insights: ExecutiveSummaryInsight[];
};

function compareNumbersDesc(left: number, right: number) {
  return right - left;
}

function safeRate(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return (numerator / denominator) * 100;
}

export async function getExecutiveSummaryPageData(period: DashboardPeriod): Promise<ExecutiveSummaryPageData> {
  const [dashboard, conversion, acquisition, customers, products] = await Promise.all([
    getDashboardMetrics(period),
    getConversionAnalyticsMetrics(period),
    getAcquisitionAnalyticsPageData({ period, sort: "revenue" }),
    getCustomerAnalyticsPageData({ period, sort: "revenue", q: "", page: 1, pageSize: 10 }),
    getProductAnalyticsPageData({ period, sort: "revenue", page: 1, pageSize: 10 }),
  ]);

  const topProductByUnits = products.charts.topSold[0] ?? null;
  const topCampaign = acquisition.campaigns[0] ?? null;
  const funnelDropOff =
    [...conversion.funnel]
      .filter((stage) => stage.key !== "sessions")
      .sort((left, right) => compareNumbersDesc(left.dropOffFromPrevious, right.dropOffFromPrevious))[0] ?? null;

  const insights: ExecutiveSummaryInsight[] = [];

  if (dashboard.summary.paidOrders > 0 || dashboard.summary.billingTotal > 0 || conversion.summary.sessions > 0) {
    if (funnelDropOff) {
      insights.push({
        label: "Mayor caída del funnel",
        value: `${funnelDropOff.label} pierde ${funnelDropOff.dropOffFromPrevious.toFixed(1)}% vs. la etapa anterior.`,
        tone: "warning",
      });
    }

    if (acquisition.summary.cartAbandoned > 0 || acquisition.summary.checkoutAbandoned > 0) {
      insights.push({
        label: "Abandono visible",
        value: `${acquisition.summary.cartAbandoned + acquisition.summary.checkoutAbandoned} carritos / checkouts quedaron sin compra en el período.`,
        tone: "accent",
      });
    }

    if (customers.summary.recurrentCustomers > customers.summary.newCustomers) {
      insights.push({
        label: "Recompra dominante",
        value: "Los clientes recurrentes superan a los nuevos en la cohorte del período.",
        tone: "success",
      });
    } else if (customers.summary.newCustomers > customers.summary.recurrentCustomers) {
      insights.push({
        label: "Adquisición dominante",
        value: "Los clientes nuevos superan a los recurrentes en la cohorte del período.",
        tone: "accent",
      });
    }

    if (topProductByUnits && dashboard.summary.unitsSold > 0) {
      const share = safeRate(topProductByUnits.value, dashboard.summary.unitsSold);

      if (share >= 35) {
        insights.push({
          label: "Concentración de producto",
          value: `${topProductByUnits.productName} explica ${share.toFixed(1)}% de las unidades vendidas.`,
          tone: "warning",
        });
      }
    }

    if (topCampaign) {
      insights.push({
        label: "Campaña destacada",
        value: `${topCampaign.campaign} lidera la adquisición con ${topCampaign.sessions} sesiones y ${topCampaign.billingTotal.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })}.`,
        tone: "neutral",
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      label: "Sin señales relevantes",
      value: "No hay suficiente actividad para generar alertas ejecutivas relevantes en este período.",
      tone: "neutral",
    });
  }

  return {
    period,
    dashboard,
    conversion,
    acquisition,
    customers,
    products,
    insights: insights.slice(0, 5),
  };
}
