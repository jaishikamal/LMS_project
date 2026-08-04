"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import NotificationFeed, { type FeedNotification } from "./NotificationFeed";

const NotificationBell = ({
  notifications,
  unreadMessages,
}: {
  notifications: FeedNotification[];
  unreadMessages: number;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-6" ref={ref}>
      {/* MESSAGES */}
      <Link
        href="/list/messages"
        title="Messages"
        className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
      >
        <Image src="/message.png" alt="Messages" width={20} height={20} />
        {unreadMessages > 0 && (
          <span className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
            {unreadMessages}
          </span>
        )}
      </Link>
      {/* NOTIFICATIONS */}
      <div className="relative">
        <button
          onClick={() => setOpen((prev) => !prev)}
          title="Notifications"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
        >
          <Image
            src="/announcement.png"
            alt="Notifications"
            width={20}
            height={20}
          />
          {unreadNotifications > 0 && (
            <span className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
              {unreadNotifications}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 top-10 w-80 max-w-[90vw] bg-white rounded-lg shadow-lg border border-gray-100 p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg font-semibold">Notifications</h1>
              <Link
                href="/list/notifications"
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                View All
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <NotificationFeed items={notifications} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationBell;
