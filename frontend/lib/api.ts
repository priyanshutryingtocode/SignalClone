export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("signal_token");
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    timeout?: number;
  } = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    timeout = 10000,
  } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = res.statusText || `Request failed with status ${res.status}`;

      try {
        const errBody = await res.json();
        if (typeof errBody?.detail === "string") {
          detail = errBody.detail;
        }
      } catch {
        // Ignore non-JSON error bodies.
      }

      throw new ApiError(detail, res.status);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out: ${method} ${path}`);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}