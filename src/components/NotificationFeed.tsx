"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import { markNotificationRead } from "@/lib/actions";

export type FeedNotification = {
  id: number;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
};

const formatTime = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const NotificationFeed = ({ items }: { items: FeedNotification[] }) => {
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.read).length;

  const markRead = (id: number) => {
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (result.success) {
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {unread > 0 ? `${unread} unread` : "All caught up"}
        </p>
        {unread > 0 && (
          <button
            onClick={() => items.filter((i) => !i.read).forEach((i) => markRead(i.id))}
            disabled={isPending}
            className="text-sm text-blue-500 hover:underline disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No notifications for you yet.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`border border-gray-200 rounded-lg overflow-hidden ${!item.read ? "bg-kamal-purple-light/60" : "bg-white"}`}
          >
            <button
              onClick={() => {
                setOpenId(openId === item.id ? null : item.id);
                if (!item.read) markRead(item.id);
              }}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-kamal-purple-light transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                )}
                <span className="font-medium truncate">{item.title}</span>
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {formatTime(item.createdAt)}
              </span>
            </button>
            {openId === item.id && (
              <div className="px-4 py-3 border-t border-gray-100 bg-white text-sm whitespace-pre-wrap">
                {item.message}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationFeed;
