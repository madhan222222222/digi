
 // Typed fetch layer for the FastAPI backend.
const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// API error details.
export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`request failed with ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

type JsonBody = unknown;

async function request<T>(
  method: string,
  path: string,
  body?: JsonBody
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    headers:
      body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// API methods.
export const apiGet = <T>(path: string) =>
  request<T>("GET", path);

export const apiPost = <T>(path: string, body?: JsonBody) =>
  request<T>("POST", path, body ?? null);

export const apiPut = <T>(path: string, body?: JsonBody) =>
  request<T>("PUT", path, body ?? null);

export const apiPatch = <T>(path: string, body?: JsonBody) =>
  request<T>("PATCH", path, body ?? null);

export const apiDelete = <T>(path: string) =>
  request<T>("DELETE", path);

// Multipart file uploads.
export async function apiUpload<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new ApiError(res.status, errBody);
  }

  return (await res.json()) as T;
}
