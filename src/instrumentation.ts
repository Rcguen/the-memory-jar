import type { Instrumentation } from "next";

function sanitizePath(path: string): string {
  return path.split("?")[0] || "/";
}

/**
 * Temporary Preview diagnostics for server-render failures. Keep this payload
 * deliberately small: request headers, cookies, bodies, and user data must
 * never enter runtime logs.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;
  const renderType = (context as typeof context & { renderType?: string }).renderType;
  console.error("[server-request-error]", {
    message,
    stack,
    digest,
    method: request.method,
    path: sanitizePath(request.path),
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    renderType,
  });
};
