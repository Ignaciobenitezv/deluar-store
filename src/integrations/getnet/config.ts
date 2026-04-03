import { env } from "@/lib/env";

export const getnetConfig = {
  environment: env.getnetEnvironment,
  apiBaseUrl: env.getnetApiBaseUrl,
  merchantId: env.getnetMerchantId,
  clientId: env.getnetClientId,
  clientSecret: env.getnetClientSecret,
  successUrl: env.getnetSuccessUrl,
  failureUrl: env.getnetFailureUrl,
  pendingUrl: env.getnetPendingUrl,
} as const;

export function hasGetnetCredentials() {
  return Boolean(
    getnetConfig.apiBaseUrl &&
      getnetConfig.merchantId &&
      getnetConfig.clientId &&
      getnetConfig.clientSecret,
  );
}
