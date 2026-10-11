import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useMe } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface NotificationsResponse {
  items: Notification[];
  unread: number;
}

export function NotificationBell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<NotificationsResponse>("/notifications"),
    enabled: !!me?.user,
    refetchInterval: 60_000,
  });

  const readAll = useMutation({
    mutationFn: () => apiPost("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!me?.user || !data) return null;
  const unread = data.unread;

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
        aria-label="Notifications"
        data-testid="notifications-bell-btn"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-600 px-1 font-mono text-[10px] font-bold text-white"
            data-testid="notifications-unread-count"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" data-testid="notifications-panel">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="font-heading text-sm font-bold text-slate-900">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => readAll.mutate()} data-testid="notifications-mark-all-read-btn">
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {data.items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
          )}
          {data.items.map((n) => (
            <button
              key={n.id}
              className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50 ${
                n.read ? "" : "bg-teal-50/50"
              }`}
              data-testid={`notification-item-${n.id}`}
              onClick={() => {
                if (!n.read) markRead.mutate(n.id);
                if (n.link) {
                  navigate(n.link);
                }
              }}
            >
              <span className="flex items-center gap-2">
                {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />}
                <span className="text-sm font-medium text-slate-900">{n.title}</span>
              </span>
              {n.body && <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">{n.body}</span>}
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-wide text-slate-400">
                {formatDateTime(n.created_at)}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
