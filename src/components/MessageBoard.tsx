"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
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
import InputField from "./InputField";
import SelectField from "./SelectField";

export type MessageRecipient = {
  role: "admin" | "teacher" | "student" | "parent";
  value: string;
  label: string;
};

export type InboxMessage = {
  id: number;
  senderId: string;
  senderRole: string;
  subject: string;
  body: string;
  sentAt: Date;
  readAt: Date | null;
};

export type OutboxMessage = {
  id: number;
  recipientId: string;
  recipientRole: string;
  subject: string;
  sentAt: Date;
  readAt: Date | null;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students",
  parent: "Parents",
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admins" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents" },
];

const ROLE_STYLES: Record<string, { badge: string; avatar: string }> = {
  admin: { badge: "bg-purple-100 text-purple-700", avatar: "bg-purple-500" },
  teacher: { badge: "bg-sky-100 text-sky-700", avatar: "bg-sky-500" },
  student: { badge: "bg-amber-100 text-amber-800", avatar: "bg-amber-500" },
  parent: { badge: "bg-emerald-100 text-emerald-700", avatar: "bg-emerald-500" },
};

const ICONS = {
  inbox:
    "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  sent: "M22 2 11 13M22 2 15 22l-4-9-9-4z",
  compose: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  reply: "M9 17 4 12l5-5M20 18v-2a4 4 0 0 0-4-4H4",
  alert:
    "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
} as const;

const Icon = ({
  d,
  className = "w-4 h-4",
}: {
  d: string;
  className?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    <path d={d} />
  </svg>
);

const formatTime = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const roleInitial = (role: string) => (role ? role[0].toUpperCase() : "?");

const RoleAvatar = ({ role }: { role: string }) => (
  <div
    className={`w-10 h-10 rounded-full ${
      ROLE_STYLES[role]?.avatar ?? "bg-gray-400"
    } text-white flex items-center justify-center font-semibold text-sm shadow-sm shrink-0`}
  >
    {roleInitial(role)}
  </div>
);

const RoleBadge = ({ role }: { role: string }) => (
  <span
    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
      ROLE_STYLES[role]?.badge ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {ROLE_LABELS[role] ?? role}
  </span>
);

const MessageBoard = ({
  myId,
  myRole,
  initialInbox,
  initialOutbox,
  recipients,
}: {
  myId: string;
  myRole: string;
  initialInbox: InboxMessage[];
  initialOutbox: OutboxMessage[];
  recipients: MessageRecipient[];
}) => {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [openId, setOpenId] = useState<number | null>(null);
  const [composeRole] = useState<string>("teacher");
  const [isPending, startTransition] = useTransition();
  const [live, setLive] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [state, setState] = useState<ActionState>({
    success: false,
    error: null,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<MessageInput, unknown, MessageSchema>({
    resolver: zodFormResolver(messageSchema),
  });

  const watchedRole = watch("recipientRole") ?? composeRole;
  const roleRecipients = recipients.filter((r) => r.role === watchedRole);

  // Connect to the real-time socket once. The token is issued per session by
  // /api/socket-token; incoming messages and read receipts refresh the page so
  // inbox/sent reflect live data.
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
        socket.on("message:new", (data: { subject?: string }) => {
          if (data?.subject) {
            toast.info(`New message: ${data.subject}`);
          }
          router.refresh();
        });
        socket.on("message:read", () => {
          router.refresh();
        });
      } catch {
        // Socket unavailable — messaging still works via server actions.
      }
    };

    connect();

    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [router]);

  const handleOpen = (message: InboxMessage) => {
    setOpenId(openId === message.id ? null : message.id);
    setReplyText("");
    if (!message.readAt) {
      startTransition(async () => {
        await markMessageRead(message.id);
        socketRef.current?.emit("message:read", {
          id: message.id,
          senderId: message.senderId,
          senderRole: message.senderRole,
        });
        router.refresh();
      });
    }
  };

  // Reply back to whoever sent the message. Works across roles — the
  // recipient is the original sender (admin <-> teacher, teacher <-> parent,
  // etc.) — and the message is delivered in real-time via the socket.
  const handleReply = async (message: InboxMessage) => {
    const body = replyText.trim();
    if (!body) return;
    const values = {
      recipientId: message.senderId,
      recipientRole: message.senderRole as "admin" | "teacher" | "student" | "parent",
      subject: `Re: ${message.subject}`,
      body,
    };
    setReplying(true);
    const result = await sendMessage({ success: false, error: null }, values);
    setReplying(false);
    if (result.success) {
      socketRef.current?.emit("message:send", {
        recipientId: values.recipientId,
        recipientRole: values.recipientRole,
        senderId: myId,
        senderRole: myRole,
        subject: values.subject,
      });
      toast.success("Reply sent!");
      setReplyText("");
      router.refresh();
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await sendMessage(state, values);
      setState(result);
      if (result.success) {
        // Notify the recipient's open tab in real-time.
        socketRef.current?.emit("message:send", {
          recipientId: values.recipientId,
          recipientRole: values.recipientRole,
          senderId: myId,
          senderRole: myRole,
          subject: values.subject,
        });
        toast.success("Message sent!");
        reset();
        setTab("sent");
        router.refresh();
      } else if (result.error) {
        toast.error(result.error);
      }
    });
  });

  const unreadCount = initialInbox.filter((m) => !m.readAt).length;

  const tabs: {
    key: "inbox" | "sent" | "compose";
    label: string;
    icon: string;
  }[] = [
    { key: "inbox", label: `Inbox (${unreadCount})`, icon: ICONS.inbox },
    { key: "sent", label: "Sent", icon: ICONS.sent },
    { key: "compose", label: "Compose", icon: ICONS.compose },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header: tab pills + live indicator */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-gradient-to-r from-kamal-purple to-kamal-sky text-gray-800 shadow"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon d={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
        <span
          className={`hidden sm:flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
            live
              ? "border-green-200 bg-green-50 text-green-600"
              : "border-gray-200 bg-gray-50 text-gray-400"
          }`}
        >
          <span className="relative flex w-2 h-2">
            {live && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full w-2 h-2 ${
                live ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          </span>
          {live ? "Live" : "Offline"}
        </span>
      </div>

      {/* Inbox */}
      {tab === "inbox" && (
        <div className="flex flex-col gap-2.5">
          {initialInbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-kamal-sky-light flex items-center justify-center mb-3">
                <Icon d={ICONS.inbox} className="w-8 h-8 text-kamal-sky" />
              </div>
              <p className="text-sm font-medium text-gray-600">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">
                When someone sends you a message, it will appear here.
              </p>
            </div>
          ) : (
            initialInbox.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl border shadow-sm transition-all overflow-hidden ${
                  openId === message.id
                    ? "border-kamal-purple shadow-md"
                    : "border-gray-200 hover:border-kamal-purple/60 hover:shadow"
                }`}
              >
                <button
                  onClick={() => handleOpen(message)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    !message.readAt ? "bg-kamal-purple-light/70" : "bg-white"
                  }`}
                >
                  <div className="relative shrink-0">
                    <RoleAvatar role={message.senderRole} />
                    {!message.readAt && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-2">
                      <RoleBadge role={message.senderRole} />
                      {!message.readAt && (
                        <span className="text-xs font-semibold text-blue-600">
                          New
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-medium truncate ${
                        message.readAt ? "text-gray-700" : "text-gray-900"
                      }`}
                    >
                      {message.subject}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {formatTime(message.sentAt)}
                  </span>
                </button>
                {openId === message.id && (
                  <div className="px-4 py-4 border-t border-gray-100 bg-white">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-xl p-4">
                      {message.body}
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <label className="text-xs font-medium text-gray-500">
                        Reply to {ROLE_LABELS[message.senderRole]}
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder={`Reply to ${message.subject}...`}
                          className="flex-1 ring-[1.5px] ring-gray-200 focus:ring-kamal-purple outline-none p-3 rounded-xl text-sm w-full h-24 resize-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => handleReply(message)}
                          disabled={replying || !replyText.trim()}
                          className="self-end sm:self-auto flex items-center gap-2 bg-gradient-to-r from-kamal-purple to-kamal-sky text-gray-800 font-medium px-5 py-2.5 rounded-xl text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                          <Icon d={ICONS.reply} />
                          {replying ? "Sending..." : "Send reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sent */}
      {tab === "sent" && (
        <div className="flex flex-col gap-2.5">
          {initialOutbox.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-kamal-sky-light flex items-center justify-center mb-3">
                <Icon d={ICONS.sent} className="w-8 h-8 text-kamal-sky" />
              </div>
              <p className="text-sm font-medium text-gray-600">
                Nothing sent yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Messages you send will be tracked here.
              </p>
            </div>
          ) : (
            initialOutbox.map((message) => (
              <div
                key={message.id}
                className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm hover:border-kamal-purple/60 transition-all"
              >
                <RoleAvatar role={message.recipientRole} />
                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-2">
                    <RoleBadge role={message.recipientRole} />
                  </div>
                  <span className="font-medium text-gray-800 truncate">
                    {message.subject}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      message.readAt
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                    title={message.readAt ? "Read" : "Not read yet"}
                  >
                    {message.readAt ? "✓✓ Read" : "✓ Sent"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(message.sentAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Compose */}
      {tab === "compose" && (
        <form
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-5"
          onSubmit={onSubmit}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-kamal-purple to-kamal-sky flex items-center justify-center shadow-sm">
              <Icon d={ICONS.compose} className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Compose Message</h2>
              <p className="text-xs text-gray-400">
                Send a message to any member of the school
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Recipient Type"
              name="recipientRole"
              register={register}
              options={ROLE_OPTIONS}
              defaultValue={composeRole}
              error={errors.recipientRole}
              placeholder="Select type"
            />
            <SelectField
              label="Recipient"
              name="recipientId"
              register={register}
              options={roleRecipients}
              error={errors.recipientId}
              placeholder="Select a recipient"
            />
          </div>

          <InputField
            label="Subject"
            name="subject"
            register={register}
            error={errors.subject}
          />

          <div className="flex flex-col gap-2 w-full">
            <label className="text-xs font-medium text-gray-500">Message</label>
            <textarea
              {...register("body")}
              className="ring-[1.5px] ring-gray-200 focus:ring-kamal-purple outline-none p-3 rounded-xl text-sm w-full h-32 resize-none transition"
            />
            {errors.body?.message ? (
              <p className="text-xs text-red-400">{String(errors.body.message)}</p>
            ) : null}
          </div>

          {state.error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              <Icon d={ICONS.alert} className="w-4 h-4 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-kamal-purple to-kamal-sky text-gray-800 font-medium px-6 py-2.5 rounded-xl text-sm shadow-sm hover:shadow disabled:opacity-50 disabled:shadow-none transition-all"
            >
              <Icon d={ICONS.sent} />
              {isPending ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default MessageBoard;
