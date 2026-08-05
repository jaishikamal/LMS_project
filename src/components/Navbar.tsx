import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Image from "next/image";
import NotificationBell from "./NotificationBell";
import type { FeedNotification } from "./NotificationFeed";

const Navbar = async () => {
  const { name, role, userId } = await getCurrentUser();

  // Show the user's actual profile photo when one has been uploaded.
  const profileImg = await (async () => {
    if (!userId || !role) return "/avatar.png";
    if (role === "teacher") {
      const t = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { img: true },
      });
      return t?.img || "/avatar.png";
    }
    if (role === "student") {
      const s = await prisma.student.findUnique({
        where: { id: userId },
        select: { img: true },
      });
      return s?.img || "/avatar.png";
    }
    return "/avatar.png";
  })();

  const [notifications, unreadMessages] = await Promise.all([
    role && userId
      ? prisma.notification.findMany({
          where: { role },
          include: {
            reads: {
              where: { userId },
              select: { id: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    userId
      ? prisma.message.count({ where: { recipientId: userId, readAt: null } })
      : Promise.resolve(0),
  ]);

  const feed: FeedNotification[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    read: item.reads.length > 0,
  }));

  return (
    <div className="flex items-center justify-between p-4">
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <NotificationBell notifications={feed} unreadMessages={unreadMessages} />
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium">{name}</span>
          <span className="text-[10px] text-gray-500 text-right capitalize">
            {role}
          </span>
        </div>
        <Image
          src={profileImg}
          alt=""
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
      </div>
    </div>
  );
};

export default Navbar;
