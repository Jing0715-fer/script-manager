// @ts-nocheck
'use client';

import React, { useMemo } from 'react';
import {
  Bell, CheckCircle2, XCircle, Info, CheckCheck, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useScriptStore } from '@/store/script-store';
import { formatDistanceToNow } from 'date-fns';

// ─── Time Grouping Helper ──────────────────────────────────────────
type TimeGroup = 'Today' | 'Yesterday' | 'Older';

function getTimeGroup(timestamp: number): TimeGroup {
  const now = new Date();
  const date = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (timestamp >= todayStart) return 'Today';
  if (timestamp >= yesterdayStart) return 'Yesterday';
  return 'Older';
}

function formatTimestamp(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

// ─── NotificationsPanel Component ─────────────────────────────────

export function NotificationsPanel() {
  const store = useScriptStore();
  const notifications = store.notifications;
  const count = notifications.length;

  // Group notifications by time
  const groups = useMemo(() => {
    const result: { group: TimeGroup; items: typeof notifications }[] = [];
    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const older: typeof notifications = [];

    notifications.forEach((n: any) => {
      const g = getTimeGroup(n.timestamp);
      if (g === 'Today') today.push(n);
      else if (g === 'Yesterday') yesterday.push(n);
      else older.push(n);
    });

    if (today.length > 0) result.push({ group: 'Today', items: today });
    if (yesterday.length > 0) result.push({ group: 'Yesterday', items: yesterday });
    if (older.length > 0) result.push({ group: 'Older', items: older });

    return result;
  }, [notifications]);

  const typeConfig = {
    success: { icon: <CheckCircle2 className="size-3.5 text-emerald-500" />, borderColor: 'border-l-emerald-500' },
    error: { icon: <XCircle className="size-3.5 text-red-500" />, borderColor: 'border-l-red-500' },
    info: { icon: <Info className="size-3.5 text-sky-500" />, borderColor: 'border-l-sky-500' },
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative active:scale-90 transition-transform"
          aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span className="notification-pulse absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5 leading-none animate-in zoom-in">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-lg" align="end" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <Bell className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Notifications</span>
            {count > 0 && (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                {count}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {count > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-emerald-600 active:scale-90 transition-all"
                  onClick={store.clearNotifications}
                  title="Clear all notifications"
                >
                  <CheckCheck className="size-3.5" />
                </Button>
                <Separator orientation="vertical" className="h-3.5 mx-0.5" />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-rose-600 active:scale-90 transition-all"
                  onClick={store.clearNotifications}
                  title="Clear all"
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="size-10 rounded-full bg-muted/50 flex items-center justify-center mb-2.5">
                <Bell className="size-5 text-muted-foreground/30" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">No new notifications</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">Actions you perform will appear here</p>
            </div>
          ) : (
            <div>
              {groups.map(({ group, items }) => (
                <div key={group}>
                  {/* Group header */}
                  <div className="px-3 py-1.5 bg-muted/10 sticky top-0 z-10">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </span>
                  </div>
                  <div className="divide-y">
                    {items.map((n: any) => {
                      const config = typeConfig[n.type as keyof typeof typeConfig] || typeConfig.info;
                      return (
                        <div
                          key={n.id}
                          className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors border-l-2 notification-enter ${config.borderColor}`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-snug">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatTimestamp(n.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {count > 0 && (
          <div className="px-3 py-2 border-t bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1.5"
              onClick={store.clearNotifications}
            >
              <Trash2 className="size-3" />
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
