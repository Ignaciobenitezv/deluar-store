import { env } from "@/lib/env";

export const isFinalProduction = env.vercelEnv === "production";
export const isReviewDeployment = !isFinalProduction;
export const shouldIndexSite = isFinalProduction;
export const canUseRealPayments = isFinalProduction;

export const reviewPaymentMessage =
  "Esta versión es de prueba. Los pagos todavía no están habilitados.";
