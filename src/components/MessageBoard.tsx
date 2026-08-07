"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { io, type Socket } from "socket.io-client";
import { markMessageRead, sendMessage } from "@/lib/actions";
import type { ActionState } from "@/lib/actionState";
import { zodFormResolver } from "@/lib/formResolver";
import {
  messageSchema,
  type MessageInput,
  type MessageSchema,
} from "@/lib/formSchemas";

export type MessageRecipient = {
  role: "admin" | "teacher" | "student" | "parent";
  value: string;
  label: string;
};

export type InboxMessage = {
  id: number;
  senderId: string;
  senderRole: string;
  senderName: string;
  subject: string;
  body: string;
  sentAt: Date;
  readAt: Date | null;
};

export type OutboxMessage = {
  id: number;
  recipientId: string;
  recipientRole: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: Date;
  readAt: Date | null;
};

export type SocketMessage = {
  id: number;
  senderId: string;
  senderRole: string;
  senderName: string;
  subject: string;
  body: string;
  sentAt: string;
};

type ConvMessage = {
  id: number;
  fromMe: boolean;
  subject: string;
  body: string;
  sentAt: Date;
  readAt: Date | null;
};

type Conversation = {
  key: string;
  counterpartId: string;
  counterpartRole: string;
  counterpartName: string;
  messages: ConvMessage[];
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
];

const ROLE_STYLES: Record<
  string,
  { badge: string; avatar: string; ring: string }
> = {
  admin: {
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
    avatar: "bg-gradient-to-tr from-purple-600 to-indigo-500",
    ring: "ring-purple-500",
  },
  teacher: {
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    avatar: "bg-gradient-to-tr from-blue-600 to-cyan-500",
    ring: "ring-blue-500",
  },
  student: {
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    avatar: "bg-gradient-to-tr from-amber-500 to-orange-500",
    ring: "ring-amber-500",
  },
  parent: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    avatar: "bg-gradient-to-tr from-emerald-600 to-teal-500",
    ring: "ring-emerald-500",
  },
};

const formatTime = (value: Date | string) => {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const pad = (n: number) => String(n).padStart(2, "0");
  const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (isToday) return timeStr;
  return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
};

const roleInitial = (name: string, role: string) => {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return role ? role[0].toUpperCase() : "?";
};

const MessengerAvatar = ({
  name,
  role,
  size = "md",
  showStatus = true,
}: {
  name: string;
  role: string;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm font-semibold",
    lg: "w-14 h-14 text-base font-bold",
  }[size];

  const dotClasses = {
    sm: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 border",
    md: "w-3.5 h-3.5 bottom-0 right-0 border-2",
    lg: "w-4 h-4 bottom-0.5 right-0.5 border-2",
  }[size];

  return (
    <div className="relative shrink-0 inline-block">
      <div
        className={`${sizeClasses} rounded-full ${
          ROLE_STYLES[role]?.avatar ?? "bg-gradient-to-tr from-blue-600 to-indigo-600"
        } text-white flex items-center justify-center shadow-sm select-none tracking-wider`}
      >
        {roleInitial(name, role)}
      </div>
      {showStatus && (
        <span
          className={`absolute ${dotClasses} rounded-full bg-emerald-500 border-white dark:border-slate-900 shadow-sm`}
          title="Online"
        />
      )}
    </div>
  );
};

// SVG Icons for Messenger Aesthetic
const Icons = {
  search: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  ),
  compose: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-3.267 1.089a.5.5 0 0 1-.632-.633l1.089-3.267a2 2 0 0 1 .506-.855z" />
    </svg>
  ),
  send: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.996.996 0 00-1.37 1.15l1.9 6.25-1.9 6.25a.996.996 0 001.37 1.15zM6.1 11.5l-1.3-4.28L15.3 12 4.8 14.78l1.3-4.28h6.9v-2H6.1z" />
    </svg>
  ),
  paperclip: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  smile: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  ),
  phone: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  video: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /><rect width="14" height="12" x="2" y="6" rx="2" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  checkDouble: (
    <svg className="w-3.5 h-3.5 inline-block text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" />
    </svg>
  ),
  checkSingle: (
    <svg className="w-3.5 h-3.5 inline-block text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  thumbsUp: (
    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
      <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.58 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2.06z" />
    </svg>
  ),
  close: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
};

const MessageBoard = ({
  myId,
  myRole,
  myName,
  initialInbox,
  initialOutbox,
  recipients,
}: {
  myId: string;
  myRole: string;
  myName: string;
  initialInbox: InboxMessage[];
  initialOutbox: OutboxMessage[];
  recipients: MessageRecipient[];
}) => {
  const [selectedConvKey, setSelectedConvKey] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [live, setLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConvKeyRef = useRef<string | null>(null);

  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [state, setState] = useState<ActionState>({
    success: false,
    error: null,
  });

  const [inbox, setInbox] = useState<InboxMessage[]>(initialInbox);
  const [outbox, setOutbox] = useState<OutboxMessage[]>(initialOutbox);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MessageInput, unknown, MessageSchema>({
    resolver: zodFormResolver(messageSchema),
  });

  const watchedRole = watch("recipientRole") ?? "teacher";
  const roleRecipients = recipients.filter((r) => r.role === watchedRole);

  // Group all messages (incoming + outgoing) into conversations by the other
  // party so each thread shows both sides like a messenger app.
  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>();

    for (const m of inbox) {
      const key = `${m.senderRole}:${m.senderId}`;
      const conv = map.get(key) ?? {
        key,
        counterpartId: m.senderId,
        counterpartRole: m.senderRole,
        counterpartName: m.senderName,
        messages: [],
      };
      conv.messages.push({
        id: m.id,
        fromMe: false,
        subject: m.subject,
        body: m.body,
        sentAt: m.sentAt,
        readAt: m.readAt,
      });
      map.set(key, conv);
    }

    for (const m of outbox) {
      const key = `${m.recipientRole}:${m.recipientId}`;
      const conv = map.get(key) ?? {
        key,
        counterpartId: m.recipientId,
        counterpartRole: m.recipientRole,
        counterpartName: m.recipientName,
        messages: [],
      };
      conv.messages.push({
        id: m.id,
        fromMe: true,
        subject: m.subject,
        body: m.body,
        sentAt: m.sentAt,
        readAt: m.readAt,
      });
      map.set(key, conv);
    }

    const list = Array.from(map.values());
    for (const c of list) {
      c.messages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
    }
    list.sort((a, b) => {
      const la = a.messages[a.messages.length - 1].sentAt.getTime();
      const lb = b.messages[b.messages.length - 1].sentAt.getTime();
      return lb - la;
    });
    return list;
  }, [inbox, outbox]);

  const selectedConv =
    conversations.find((c) => c.key === selectedConvKey) ?? null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConvKey, selectedConv?.messages.length, live]);

  useEffect(() => {
    selectedConvKeyRef.current = selectedConvKey;
  }, [selectedConvKey]);

  // Auto-select the most recent conversation on load.
  useEffect(() => {
    if (selectedConvKey === null && conversations.length > 0) {
      setSelectedConvKey(conversations[0].key);
    }
  }, [conversations, selectedConvKey]);

  // Connect real-time socket
  useEffect(() => {
    let disposed = false;
    let socket: Socket | null = null;

    const connect = async () => {
      try {
        const res = await fetch("/api/socket-token");
        if (!res.ok) return;
        const { token } = await res.json();
        if (disposed || typeof token !== "string") return;

        socket = io({ auth: { token } });
        socketRef.current = socket;

        socket.on("connect", () => setLive(true));
        socket.on("disconnect", () => setLive(false));
        socket.on("message:new", (data: SocketMessage) => {
          if (!data || typeof data.id !== "number") return;
          toast.info(`New message from ${data.senderName}`);
          setInbox((prev) =>
            prev.some((m) => m.id === data.id)
              ? prev
              : [
                  {
                    id: data.id,
                    senderId: data.senderId,
                    senderRole: data.senderRole,
                    senderName: data.senderName,
                    subject: data.subject,
                    body: data.body,
                    sentAt: new Date(data.sentAt),
                    readAt: null,
                  },
                  ...prev,
                ]
          );
          // If we are currently viewing this conversation, mark it read.
          const viewing =
            selectedConvKeyRef.current === `${data.senderRole}:${data.senderId}`;
          if (viewing) {
            setInbox((prev) =>
              prev.map((m) =>
                m.id === data.id ? { ...m, readAt: new Date() } : m
              )
            );
            startTransition(async () => {
              await markMessageRead(data.id);
              socketRef.current?.emit("message:read", {
                id: data.id,
                senderId: data.senderId,
                senderRole: data.senderRole,
              });
            });
          }
        });
        socket.on("message:read", (data: { id?: unknown }) => {
          if (typeof data?.id !== "number") return;
          setOutbox((prev) =>
            prev.map((m) =>
              m.id === data.id ? { ...m, readAt: new Date() } : m
            )
          );
        });
      } catch {
        // Socket fallback to action refresh
      }
    };

    connect();

    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConvKey(conv.key);
    const unread = conv.messages.filter((m) => !m.fromMe && !m.readAt);
    if (unread.length === 0) return;
    const ids = new Set(unread.map((m) => m.id));
    setInbox((prev) =>
      prev.map((m) => (ids.has(m.id) ? { ...m, readAt: new Date() } : m))
    );
    startTransition(async () => {
      for (const m of unread) {
        await markMessageRead(m.id);
        socketRef.current?.emit("message:read", {
          id: m.id,
          senderId: conv.counterpartId,
          senderRole: conv.counterpartRole,
        });
      }
    });
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;

    const lastMsg = selectedConv.messages[selectedConv.messages.length - 1];
    const baseSubject = lastMsg?.subject || "Message";
    const subject = baseSubject.startsWith("Re:")
      ? baseSubject
      : `Re: ${baseSubject}`;
    const body = replyText.trim();
    const values = {
      recipientId: selectedConv.counterpartId,
      recipientRole: selectedConv.counterpartRole as
        | "admin"
        | "teacher"
        | "student"
        | "parent",
      subject,
      body,
    };

    setReplying(true);
    const result = await sendMessage({ success: false, error: null }, values);
    setReplying(false);

    if (result.success) {
      const created = result.data as {
        id: number;
        recipientId: string;
        recipientRole: string;
        subject: string;
        body: string;
        sentAt: Date;
      };
      const outboxItem: OutboxMessage = {
        id: created.id,
        recipientId: created.recipientId,
        recipientRole: created.recipientRole,
        recipientName: selectedConv.counterpartName,
        subject: created.subject,
        body: created.body,
        sentAt: created.sentAt,
        readAt: null,
      };
      setOutbox((prev) => [outboxItem, ...prev]);
      socketRef.current?.emit("message:send", {
        ...outboxItem,
        senderId: myId,
        senderRole: myRole,
        senderName: myName,
        sentAt: created.sentAt.toISOString(),
      });
      toast.success("Reply sent!");
      setReplyText("");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const onComposeSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await sendMessage(state, values);
      setState(result);
      if (result.success) {
        const created = result.data as {
          id: number;
          recipientId: string;
          recipientRole: string;
          subject: string;
          body: string;
          sentAt: Date;
        };
        const outboxItem: OutboxMessage = {
          id: created.id,
          recipientId: created.recipientId,
          recipientRole: created.recipientRole,
          recipientName:
            recipients.find((r) => r.value === created.recipientId)?.label ??
            created.recipientId,
          subject: created.subject,
          body: created.body,
          sentAt: created.sentAt,
          readAt: null,
        };
        setOutbox((prev) => [outboxItem, ...prev]);
        socketRef.current?.emit("message:send", {
          ...outboxItem,
          senderId: myId,
          senderRole: myRole,
          senderName: myName,
          sentAt: created.sentAt.toISOString(),
        });
        toast.success("Message sent!");
        reset();
        setIsComposeOpen(false);
        setSelectedConvKey(`${created.recipientRole}:${created.recipientId}`);
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  });

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    const last = c.messages[c.messages.length - 1];
    return (
      c.counterpartName.toLowerCase().includes(q) ||
      (last?.body.toLowerCase().includes(q) ?? false) ||
      (last?.subject.toLowerCase().includes(q) ?? false)
    );
  });

  const totalUnread = conversations.reduce(
    (sum, c) =>
      sum + c.messages.filter((m) => !m.fromMe && !m.readAt).length,
    0
  );

  const formatDivider = (value: Date) => {
    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`;
  };

  const renderMessages = () => {
    if (!selectedConv) return null;
    let lastDate: string | null = null;
    return selectedConv.messages.map((msg) => {
      const dateStr = new Date(msg.sentAt).toDateString();
      const showDivider = dateStr !== lastDate;
      lastDate = dateStr;
      return (
        <div key={msg.id} className="space-y-1">
          {showDivider && (
            <div className="flex justify-center my-3">
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full">
                {formatDivider(msg.sentAt)}
              </span>
            </div>
          )}
          {msg.fromMe ? (
            <div className="flex items-end justify-end gap-2">
              <div className="flex flex-col items-end gap-1 max-w-[80%]">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-md shadow-blue-500/10 whitespace-pre-wrap">
                  {msg.body}
                </div>
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span>You</span>
                  <span>{formatTime(msg.sentAt)}</span>
                  {msg.readAt ? Icons.checkDouble : Icons.checkSingle}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <MessengerAvatar
                name={selectedConv.counterpartName}
                role={selectedConv.counterpartRole}
                size="sm"
              />
              <div className="flex flex-col gap-1 max-w-[80%]">
                <div className="bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                  {msg.body}
                </div>
                <span className="text-[10px] text-slate-400">
                  {formatTime(msg.sentAt)}
                </span>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden font-sans">
      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/40 ${
            selectedConvKey !== null ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Chats
              </h1>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                  {totalUnread}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  live
                    ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400"
                    : "border-slate-200 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {live ? "Live" : "Offline"}
              </span>
            </div>
            <button
              onClick={() => setIsComposeOpen(true)}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all"
              title="New Message"
            >
              {Icons.compose}
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/80">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400">
                {Icons.search}
              </span>
              <input
                type="text"
                placeholder="Search Messenger"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-200/60 dark:bg-slate-800/70 border-none rounded-full text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  {Icons.close}
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {conversations.length === 0
                  ? "No conversations yet. Start by sending a message."
                  : "No conversations match your search."}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const last = conv.messages[conv.messages.length - 1];
                const unread = conv.messages.filter(
                  (m) => !m.fromMe && !m.readAt
                ).length;
                const isSelected = selectedConvKey === conv.key;
                return (
                  <button
                    key={conv.key}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-3.5 flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-blue-50/90 dark:bg-blue-950/40 border-l-4 border-blue-600"
                        : "hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <MessengerAvatar
                      name={conv.counterpartName}
                      role={conv.counterpartRole}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-sm truncate ${
                            unread > 0
                              ? "font-bold text-slate-900 dark:text-white"
                              : "font-semibold text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {conv.counterpartName}
                        </span>
                        {last && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTime(last.sentAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            unread > 0
                              ? "font-bold text-slate-900 dark:text-slate-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {last?.fromMe && (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              You:{" "}
                            </span>
                          )}
                          {last?.body || last?.subject || "\u00A0"}
                        </p>
                        {unread > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold shrink-0 shadow-sm">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Main Pane: Active Conversation Thread */}
        <div
          className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${
            selectedConvKey === null ? "hidden md:flex" : "flex"
          }`}
        >
          {selectedConv ? (
            <>
              {/* Chat Thread Header */}
              <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvKey(null)}
                    className="md:hidden p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    {Icons.back}
                  </button>

                  <MessengerAvatar
                    name={selectedConv.counterpartName}
                    role={selectedConv.counterpartRole}
                    size="md"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                        {selectedConv.counterpartName}
                      </h2>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ROLE_STYLES[selectedConv.counterpartRole]?.badge
                        }`}
                      >
                        {ROLE_LABELS[selectedConv.counterpartRole]}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active now
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <button
                    onClick={() =>
                      toast.info(
                        `Topic: ${
                          selectedConv.messages[
                            selectedConv.messages.length - 1
                          ]?.subject ?? "Untitled"
                        }`
                      )
                    }
                    className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Conversation Details"
                  >
                    {Icons.info}
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40 dark:bg-slate-950/20">
                <div className="space-y-3">
                  {renderMessages()}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Reply Bar */}
              <form
                onSubmit={handleReplySubmit}
                className="p-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => toast.info("Attachment added")}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                  title="Attach file"
                >
                  {Icons.paperclip}
                </button>

                <button
                  type="button"
                  onClick={() => toast.info("Photos feature preview")}
                  className="p-2 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                  title="Send image"
                >
                  {Icons.image}
                </button>

                <div className="flex-1 relative flex items-center">
                  <input
                    type="text"
                    placeholder={`Message ${selectedConv.counterpartName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-4 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setReplyText((prev) => prev + " 😊")}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {Icons.smile}
                  </button>
                </div>

                {replyText.trim() ? (
                  <button
                    type="submit"
                    disabled={replying}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {Icons.send}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReplyText("👍")}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
                    title="Send thumbs up"
                  >
                    {Icons.thumbsUp}
                  </button>
                )}
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/20">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                Your Messages
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6">
                Select a conversation from the sidebar or compose a new message to get started.
              </p>
              <button
                onClick={() => setIsComposeOpen(true)}
                className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                {Icons.compose}
                <span>Start New Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  {Icons.compose}
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  New Message
                </h2>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition"
              >
                {Icons.close}
              </button>
            </div>

            <form onSubmit={onComposeSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  To (Role):
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue("recipientRole", opt.value as any)}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                        watchedRole === opt.value
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Select Recipient:
                </label>
                <select
                  {...register("recipientId")}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500/50 outline-none"
                >
                  <option value="">-- Choose recipient --</option>
                  {roleRecipients.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {errors.recipientId?.message && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    {String(errors.recipientId.message)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Subject:
                </label>
                <input
                  type="text"
                  placeholder="Topic / Subject of message..."
                  {...register("subject")}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500/50 outline-none"
                />
                {errors.subject?.message && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    {String(errors.subject.message)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Message:
                </label>
                <textarea
                  rows={4}
                  placeholder="Type your message..."
                  {...register("body")}
                  className="w-full p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500/50 outline-none resize-none"
                />
                {errors.body?.message && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    {String(errors.body.message)}
                  </p>
                )}
              </div>

              {state.error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium border border-red-200">
                  {state.error}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {Icons.send}
                  <span>{isPending ? "Sending..." : "Send Message"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBoard;
