import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { requirePermission } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type AuditRow = {
  id: number;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  createdAt: Date;
};

const baseColumns = [
  { header: "Entity", accessor: "entity" },
  { header: "Action", accessor: "action" },
  { header: "Actor", accessor: "actorId" },
  { header: "Role", accessor: "actorRole", className: "hidden md:table-cell" },
  { header: "Details", accessor: "details", className: "hidden lg:table-cell" },
  { header: "Date", accessor: "createdAt", className: "hidden lg:table-cell" },
];

const formatTime = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const ACTION_STYLES: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

const AuditPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("audit.view");

  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.AuditLogWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { entity: { contains: param, mode: "insensitive" } },
          { actorId: { contains: param, mode: "insensitive" } },
          { details: { contains: param, mode: "insensitive" } },
        ];
        break;
      default:
        break;
    }
  }

  const [logs, count] = await Promise.all([
    prisma.auditLog.findMany({
      where: query,
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.auditLog.count({ where: query }),
  ]);

  const auditData: AuditRow[] = logs.map((item) => ({
    id: item.id,
    actorId: item.actorId,
    actorRole: item.actorRole,
    action: item.action,
    entity: item.entity,
    entityId: item.entityId,
    details: item.details,
    createdAt: item.createdAt,
  }));

  const renderRow = (item: AuditRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.entity}</td>
      <td>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            ACTION_STYLES[item.action] ?? "bg-gray-100 text-gray-700"
          }`}
        >
          {item.action}
        </span>
      </td>
      <td>{item.actorId}</td>
      <td className="hidden md:table-cell">{item.actorRole}</td>
      <td className="hidden lg:table-cell">{item.details ?? "—"}</td>
      <td className="hidden lg:table-cell">{formatTime(item.createdAt)}</td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Audit Log</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
          </div>
        </div>
      </div>
      <Table columns={baseColumns} renderRow={renderRow} data={auditData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default AuditPage;
