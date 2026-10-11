import { ApiError } from "./api";

// Turn any thrown error (typically ApiError from the fetch layer) into a user-facing string.
export function apiErrorText(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (body?.detail && typeof body.detail === "string") return body.detail;
    if (err.status === 401) return "Please sign in to continue.";
    if (err.status === 403) return "You are not authorized to perform this action.";
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
