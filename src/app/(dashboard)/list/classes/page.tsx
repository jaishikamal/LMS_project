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

type Class = {
  id: number;
  name: string;
  capacity: number;
  grade: number;
  supervisor: string;
  // Raw ids feed the update form's selects; the labels above are for display.
  gradeId: number;
  supervisorId: string | null;
};

const baseColumns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Supervisor",
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("classes.view");
  const { role, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns = role === "admin" ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.ClassWhereInput = {};

  // Teachers see the classes they teach/supervise; students and parents
  // see only their own (or their children's) class(es). Kept separate and
  // AND-merged after the loop for consistency with the other list pages.
  const roleCondition: Prisma.ClassWhereInput | null =
    role !== "admin" && classIds ? { id: { in: classIds } } : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "supervisorid":
        query.supervisorId = param;
        break;
      case "teacherid":
        // Classes the teacher supervises or teaches a subject in.
        query.OR = [
          { supervisorId: param },
          { classSubjects: { some: { teacherId: param } } },
        ];
        break;
      case "gradeid": {
        const gradeId = Number(param);
        if (!Number.isInteger(gradeId)) break;
        query.gradeId = gradeId;
        break;
      }
      case "search":
        query.name = { contains: param, mode: "insensitive" };
        break;
      default:
        break;
    }
  }

  applyRoleCondition(query, roleCondition);

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const [classes, count, allGrades, allTeachers] = await Promise.all([
    prisma.class.findMany({
      where: query,
      include: {
        grade: true,
        supervisor: true,
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.class.count({ where: query }),
    // Options for the form's grade/supervisor selects.
    role === "admin"
      ? prisma.grade.findMany({ select: { id: true, level: true }, orderBy: { level: "asc" } })
      : Promise.resolve([]),
    role === "admin"
      ? prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: { name: "asc" },
      })
      : Promise.resolve([]),
  ]);

  const relatedData = {
    grades: allGrades.map((grade) => ({
      value: grade.id,
      label: `Grade ${grade.level}`,
    })),
    teachers: allTeachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} ${teacher.surname}`,
    })),
  };

  const classesData: Class[] = classes.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    capacity: classItem.capacity,
    grade: classItem.grade.level,
    // supervisorId is optional in the schema, so there may be no supervisor
    supervisor: classItem.supervisor
      ? `${classItem.supervisor.name} ${classItem.supervisor.surname}`
      : "-",
    // Raw ids for the update form's selects.
    gradeId: classItem.gradeId,
    supervisorId: classItem.supervisorId,
  }));

  const renderRow = (item: Class) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.capacity}</td>
      <td className="hidden md:table-cell">{item.grade}</td>
      <td className="hidden md:table-cell">{item.supervisor}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="class"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="class" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
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
                table="class"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={classesData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default ClassListPage;
