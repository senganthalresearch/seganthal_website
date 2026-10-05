export type Provider = "NSE" | "Yahoo Finance";
export type FailureReason = "timeout" | "network" | "http" | "invalid_response";
export class UpstreamError extends Error {
  constructor(public provider: Provider, public reason: FailureReason, public upstreamStatus?: number, options?: ErrorOptions) {
    super(provider + " request failed: " + reason + (upstreamStatus ? " (HTTP " + upstreamStatus + ")" : ""), options);
    this.name = "UpstreamError";
  }
}
const transientStatus = new Set([500, 502, 503, 504]);
/** Retry safe reads once. Never replay writes, access denials, or rate limits. */
export async function fetchUpstream(provider: Provider, input: string | URL | Request, init: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  const callerSignal = init.signal || (input instanceof Request ? input.signal : undefined);
  const attempts = method === "GET" || method === "HEAD" ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    callerSignal?.throwIfAborted();
    const deadline = AbortSignal.timeout(timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline;
    try {
      const response = await fetch(input, { ...init, signal });
      if (attempt + 1 < attempts && transientStatus.has(response.status)) {
        await response.body?.cancel();
      } else {
        // Preserve redirects and other statuses for Yahoo's cookie/auth handling.
        if (response.status === 429 || response.status >= 500) {
          await response.body?.cancel();
          throw new UpstreamError(provider, "http", response.status);
        }
        return response;
      }
    } catch (error) {
      if (callerSignal?.aborted) throw callerSignal.reason;
      if (error instanceof UpstreamError) throw error;
      if (attempt + 1 === attempts) throw new UpstreamError(provider, deadline.aborted ? "timeout" : "network", undefined, { cause: error });
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new UpstreamError(provider, "network");
}
export async function upstreamJson<T>(provider: Provider, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchUpstream(provider, url, init);
  if (!response.ok) {
    await response.body?.cancel();
    throw new UpstreamError(provider, "http", response.status);
  }
  try { return await response.json() as T; }
  catch (error) { throw new UpstreamError(provider, "invalid_response", response.status, { cause: error }); }
}
/** Only structured, non-sensitive diagnostics leave the server error object. */
export function serviceFailure(error: unknown) {
  if (error instanceof UpstreamError) {
    const detail = error.upstreamStatus === 429 ? "is temporarily limiting requests"
      : error.upstreamStatus === 401 || error.upstreamStatus === 403 ? "did not allow this data request"
      : error.reason === "timeout" ? "took too long to respond"
      : error.reason === "invalid_response" ? "returned an unexpected response"
      : "is temporarily unreachable";
    return { service: error.provider, code: error.reason, upstreamStatus: error.upstreamStatus,
      message: error.provider + " " + detail + ". Please try again shortly." };
  }
  const name = error instanceof Error ? error.name : "";
  if (/^Mongo[A-Za-z]+Error$/.test(name)) return { service: "MongoDB", code: name, message: "The team database is temporarily unavailable. Please try again shortly." };
  if (name === "FailedYahooValidationError") return { service: "Yahoo Finance", code: "invalid_response", message: "Yahoo Finance returned an unexpected response. Please try again shortly." };
  return { service: "Application", code: "internal_error", message: "This service is unavailable right now. Please try again shortly." };
}
