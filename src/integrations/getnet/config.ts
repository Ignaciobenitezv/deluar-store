import { env } from "@/lib/env";

export const getnetConfig = {
  environment: env.getnetEnvironment,
  apiBaseUrl: env.getnetApiBaseUrl,
  webCheckoutBaseUrl: env.getnetWebCheckoutBaseUrl,
  clientId: env.getnetClientId,
  clientSecret: env.getnetClientSecret,
  webhookUser: env.getnetWebhookUser,
  webhookPassword: env.getnetWebhookPassword,
} as const;

export function hasGetnetCredentials() {
  return Boolean(
    getnetConfig.apiBaseUrl &&
      getnetConfig.webCheckoutBaseUrl &&
      getnetConfig.clientId &&
      getnetConfig.clientSecret,
  );
}
