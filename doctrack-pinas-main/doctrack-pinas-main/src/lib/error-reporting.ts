/**
 * Generic client-side error reporting hook.
 *
 * By default this just logs to the console. If you wire up an error
 * monitoring provider (Sentry, Bugsnag, etc.), initialize it in
 * `src/routes/__root.tsx` and set `window.__errorReporter` to forward
 * events here without touching call sites.
 */

type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ErrorReporter = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReportOptions,
  ) => void;
};

declare global {
  interface Window {
    __errorReporter?: ErrorReporter;
  }
}

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  if (window.__errorReporter?.captureException) {
    window.__errorReporter.captureException(
      error,
      { source: "react_error_boundary", route: window.location.pathname, ...context },
      { mechanism: "react_error_boundary", handled: false, severity: "error" },
    );
    return;
  }

  console.error(`[error-boundary] ${message}`, { context, error });
}
