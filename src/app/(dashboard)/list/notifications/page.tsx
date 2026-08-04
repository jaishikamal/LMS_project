import FormModal from "@/components/FormModal";
import NotificationFeed, {
  type FeedNotification,
} from "@/components/NotificationFeed";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { requirePermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type NotificationRow = {
  id: number;
  title: string;
  message: string;
  role: string;
  createdAt: Date;
};

const baseColumns = [
  { header: "Title", accessor: "title" },
  { header: "Message", accessor: "message", className: "hidden md:table-cell" },
  { header: "Audience", accessor: "role" },
  { header: "Date", accessor: "createdAt", className: "hidden lg:table-cell" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const formatTime = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admins",
  teacher: "Teachers",
  student: "Students",
  parent: "Parents",
};

const NotificationPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { role, userId } = await requirePermission("notifications.view");

  if (role !== "admin") {
    const notifications = await prisma.notification.findMany({
      where: { role },
      include: {
        reads: {
          where: { userId },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const feed: FeedNotification[] = notifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
      read: item.reads.length > 0,
    }));

    return (
      <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Notifications</h1>
        </div>
        <NotificationFeed items={feed} />
      </div>
    );
  }

  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.NotificationWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [{ title: { contains: param, mode: "insensitive" } }];
        break;
      default:
        break;
    }
  }

  const [notifications, count] = await Promise.all([
    prisma.notification.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.notification.count({ where: query }),
  ]);

  const notificationData: NotificationRow[] = notifications.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    role: ROLE_LABELS[item.role] ?? item.role,
    createdAt: item.createdAt,
  }));

  const renderRow = (item: NotificationRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.title}</td>
      <td className="hidden md:table-cell">{item.message}</td>
      <td>{item.role}</td>
      <td className="hidden lg:table-cell">{formatTime(item.createdAt)}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal table="notification" type="update" data={item} />
          <FormModal table="notification" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Notifications
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal table="notification" type="create" />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={notificationData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default NotificationPage;
