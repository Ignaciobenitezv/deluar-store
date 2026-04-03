type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function getCurrentLogLevel(): LogLevel {
  const rawLevel = process.env.APP_LOG_LEVEL;

  if (rawLevel === "debug" || rawLevel === "info" || rawLevel === "warn" || rawLevel === "error") {
    return rawLevel;
  }

  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[getCurrentLogLevel()];
}

function serializeContext(context?: Record<string, unknown>) {
  if (!context) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(message, serializeContext(context));
    }
  },
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(message, serializeContext(context));
    }
  },
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(message, serializeContext(context));
    }
  },
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog("error")) {
      console.error(message, serializeContext(context));
    }
  },
};
