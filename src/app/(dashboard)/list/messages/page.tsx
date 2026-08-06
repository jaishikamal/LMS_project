import MessageBoard, {
  type InboxMessage,
  type MessageRecipient,
  type OutboxMessage,
} from "@/components/MessageBoard";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";

const MessagePage = async () => {
  const { userId, role } = await requirePermission("messages.view");

  const [inbox, outbox, admins, teachers, students, parents] =
    await Promise.all([
      prisma.message.findMany({
        where: { recipientId: userId },
        orderBy: { sentAt: "desc" },
      }),
      prisma.message.findMany({
        where: { senderId: userId },
        orderBy: { sentAt: "desc" },
      }),
      prisma.admin.findMany({
        select: { id: true, username: true },
        orderBy: { username: "asc" },
      }),
      prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: { name: "asc" },
      }),
      prisma.student.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: { name: "asc" },
      }),
      prisma.parent.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const recipients: MessageRecipient[] = [
    ...admins
      .filter((a) => !(role === "admin" && a.id === userId))
      .map((a) => ({ role: "admin" as const, value: a.id, label: `Admin · ${a.username}` })),
    ...teachers
      .filter((t) => !(role === "teacher" && t.id === userId))
      .map((t) => ({
        role: "teacher" as const,
        value: t.id,
        label: `${t.name} ${t.surname}`,
      })),
    ...students
      .filter((s) => !(role === "student" && s.id === userId))
      .map((s) => ({
        role: "student" as const,
        value: s.id,
        label: `${s.name} ${s.surname}`,
      })),
    ...parents
      .filter((p) => !(role === "parent" && p.id === userId))
      .map((p) => ({
        role: "parent" as const,
        value: p.id,
        label: `${p.name} ${p.surname}`,
      })),
  ];

  // Look up names for message senders/recipients by (role, id) so the inbox
  // and sent views can show who the message is from / to.
  const accountLookup = new Map<string, string>();
  for (const a of admins) {
    accountLookup.set(`admin:${a.id}`, `Admin · ${a.username}`);
  }
  for (const t of teachers) {
    accountLookup.set(`teacher:${t.id}`, `${t.name} ${t.surname}`);
  }
  for (const s of students) {
    accountLookup.set(`student:${s.id}`, `${s.name} ${s.surname}`);
  }
  for (const p of parents) {
    accountLookup.set(`parent:${p.id}`, `${p.name} ${p.surname}`);
  }

  const inboxData: InboxMessage[] = inbox.map((item) => ({
    id: item.id,
    senderId: item.senderId,
    senderRole: item.senderRole,
    senderName:
      accountLookup.get(`${item.senderRole}:${item.senderId}`) ??
      item.senderId,
    subject: item.subject,
    body: item.body,
    sentAt: item.sentAt,
    readAt: item.readAt,
  }));

  const outboxData: OutboxMessage[] = outbox.map((item) => ({
    id: item.id,
    recipientId: item.recipientId,
    recipientRole: item.recipientRole,
    recipientName:
      accountLookup.get(`${item.recipientRole}:${item.recipientId}`) ??
      item.recipientId,
    subject: item.subject,
    body: item.body,
    sentAt: item.sentAt,
    readAt: item.readAt,
  }));

  const myName = accountLookup.get(`${role}:${userId}`) ?? "You";

  return (
    <div className="p-4 flex-1 m-4 mt-0 min-h-0">
      <MessageBoard
        myId={userId}
        myRole={role}
        myName={myName}
        initialInbox={inboxData}
        initialOutbox={outboxData}
        recipients={recipients}
      />
    </div>
  );
};

export default MessagePage;
