// Session boundary: auth is an httpOnly cookie the backend owns; the frontend's one
// duty is wiping the react-query cache so one account's data never renders for the next.
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { apiGet, apiPost } from "./api";
import type { MeResponse } from "./types";

// The primary "who am I" read — used by layouts, guards and role-aware UI.
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<MeResponse>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

// Call after every successful login/signup.
export function beginSession(): void {
  queryClient.clear();
}

// Call from every sign-out control; the hard redirect resets all in-memory state.
export async function endSession(redirectTo: string = "/login"): Promise<void> {
  try {
    await apiPost("/auth/logout");
  } finally {
    queryClient.clear();
    window.location.assign(redirectTo);
  }
}

// Where each role lands after signing in.
export function homeForRole(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "employee":
      return "/employee";
    case "employer":
      return "/employer";
    default:
      return "/dashboard";
  }
}
