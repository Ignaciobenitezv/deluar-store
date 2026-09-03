import { performance } from "node:perf_hooks";
import { logger } from "@/lib/logger";

const enabled = process.env.ADMIN_ENVIOS_PERF_TRACE === "1";

export function isPerfTraceEnabled() {
  return enabled;
}

export async function traceAsync<T>(
  scope: string,
  label: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  if (!enabled) {
    return fn();
  }

  const start = performance.now();

  try {
    const result = await fn();
    logger.info(`${scope}.${label}.timing`, {
      ...context,
      ms: Math.round(performance.now() - start),
    });
    return result;
  } catch (error) {
    logger.info(`${scope}.${label}.timing_failed`, {
      ...context,
      ms: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

