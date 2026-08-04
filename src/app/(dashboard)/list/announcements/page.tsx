import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRoleCondition, getRoleScope } from "@/lib/roleScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Announcement = {
  id: number;
  title: string;
  class: string;
  date: string;
};

const baseColumns = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const dateFormat = new Intl.DateTimeFormat("en-US");

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("announcements.view");
  const { role, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns = role === "admin" ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.AnnouncementWhereInput = {};

  // Non-admins only see school-wide announcements plus ones targeted at
  // their own (or their children's) class(es). Kept separate and
  // AND-merged after the loop (rather than reusing `query.OR`, which the
  // "studentid"/"search" params below already use) so it can't be
  // overwritten by any of those params.
  const roleCondition: Prisma.AnnouncementWhereInput | null =
    role !== "admin" && classIds
      ? { OR: [{ classId: null }, { classId: { in: classIds } }] }
      : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.classId = classId;
        break;
      }
      // Announcements with no class are school-wide
      case "studentid":
        query.OR = [
          { classId: null },
          { class: { students: { some: { id: param } } } },
        ];
        break;
      case "search":
        query.OR = [
          { title: { contains: param, mode: "insensitive" } },
          { description: { contains: param, mode: "insensitive" } },
          { class: { name: { contains: param, mode: "insensitive" } } },
        ];
        break;
      default:
        break;
    }
  }

  applyRoleCondition(query, roleCondition);

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const [announcements, count, classes] = await Promise.all([
    prisma.announcement.findMany({
      where: query,
      include: {
        class: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.announcement.count({ where: query }),
    role === "admin"
      ? prisma.class.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // Admins can target an announcement at a class; everyone else just reads.
  const relatedData =
    role === "admin"
      ? {
          classes: classes.map((item) => ({
            value: item.id,
            label: item.name,
          })),
        }
      : undefined;

  const announcementsData: Announcement[] = announcements.map(
    (announcement) => ({
      id: announcement.id,
      title: announcement.title,
      class: announcement.class?.name ?? "-",
      date: dateFormat.format(announcement.date),
    })
  );

  const renderRow = (item: Announcement) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.class}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="announcement"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="announcement" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
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
            {role === "admin" && (
              <FormModal
                table="announcement"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={announcementsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default AnnouncementListPage;
