import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getRoleScope } from "@/lib/roleScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Guardian = {
  id: number;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  studentName: string;
  className: string;
  studentId: string;
};

const baseColumns = [
  { header: "Name", accessor: "name" },
  { header: "Relationship", accessor: "relationship" },
  { header: "Student", accessor: "studentName", className: "hidden md:table-cell" },
  { header: "Class", accessor: "className", className: "hidden lg:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const GuardianListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("guardians.view");
  const { role, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const canManage = role === "admin";
  const columns = canManage ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.GuardianWhereInput = {};

  if (role !== "admin") {
    query.student = { classId: { in: classIds ?? [] } };
  }

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "studentid":
        query.studentId = param;
        break;
      case "search":
        query.OR = [
          { name: { contains: param, mode: "insensitive" } },
          { relationship: { contains: param, mode: "insensitive" } },
          {
            student: {
              OR: [
                { name: { contains: param, mode: "insensitive" } },
                { surname: { contains: param, mode: "insensitive" } },
              ],
            },
          },
        ];
        break;
      default:
        break;
    }
  }

  const [guardians, count, allStudents] = await Promise.all([
    prisma.guardian.findMany({
      where: query,
      include: {
        student: {
          include: { class: { select: { name: true } } },
        },
      },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.guardian.count({ where: query }),
    canManage
      ? prisma.student.findMany({
          select: {
            id: true,
            name: true,
            surname: true,
            class: { select: { name: true } },
          },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const relatedData = {
    students: allStudents.map((student) => ({
      value: student.id,
      label: `${student.name} ${student.surname} · ${student.class.name}`,
    })),
  };

  const guardiansData: Guardian[] = guardians.map((item) => ({
    id: item.id,
    name: item.name,
    relationship: item.relationship,
    phone: item.phone,
    email: item.email,
    isPrimary: item.isPrimary,
    studentName: `${item.student.name} ${item.student.surname}`,
    className: item.student.class.name,
    studentId: item.studentId,
  }));

  const renderRow = (item: Guardian) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">
        {item.name}
        {item.isPrimary && (
          <span className="ml-2 text-xs bg-kamal-yellow text-gray-700 px-2 py-0.5 rounded-full">
            Primary
          </span>
        )}
      </td>
      <td>{item.relationship}</td>
      <td className="hidden md:table-cell">{item.studentName}</td>
      <td className="hidden lg:table-cell">{item.className}</td>
      <td className="hidden md:table-cell">{item.phone || "—"}</td>
      <td className="hidden lg:table-cell">{item.email || "—"}</td>
      {canManage && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="guardian"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="guardian" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Guardians</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            {canManage && (
              <FormModal
                table="guardian"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={guardiansData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default GuardianListPage;
