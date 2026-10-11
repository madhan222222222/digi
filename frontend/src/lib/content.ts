// Read admin-editable site content with a static fallback — pages always render,
// even with no backend, because the defaults live in the bundle.
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./api";
import { DEFAULT_CONTENT } from "./constants";
import type { SiteContent } from "./types";

export function useSiteContent(key: string): { text: string; isCustom: boolean } {
  const { data } = useQuery({
    queryKey: ["content", key],
    queryFn: () => apiGet<SiteContent>(`/content/${key}`),
    retry: false,
    staleTime: 5 * 60_000,
  });
  // An empty value means "not customised" — fall back to the bundled default copy.
  const custom = !!data?.value;
  return { text: custom ? data!.value : (DEFAULT_CONTENT[key] ?? ""), isCustom: custom };
}
