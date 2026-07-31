import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { applyRoleCondition, getRoleScope } from "@/lib/roleScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Assignment = {
  id: number;
  subject: string;
  class: string;
  teacher: string;
  dueDate: string;
};

const baseColumns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Due Date",
    accessor: "dueDate",
    className: "hidden md:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { role, userId, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns =
    role === "admin" || role === "teacher"
      ? [...baseColumns, actionColumn]
      : baseColumns;

  const query: Prisma.AssignmentWhereInput = {};
  const lessonFilter: Prisma.LessonWhereInput = {};

  // Kept separate and AND-merged after the loop so a `teacherId`/`classId`
  // query param can't override the role-based scoping.
  const roleCondition: Prisma.LessonWhereInput | null =
    role === "teacher" && userId
      ? { teacherId: userId }
      : (role === "student" || role === "parent") && classIds
        ? { classId: { in: classIds } }
        : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "teacherid":
        lessonFilter.teacherId = param;
        break;
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        lessonFilter.classId = classId;
        break;
      }
      case "subjectid": {
        const subjectId = Number(param);
        if (!Number.isInteger(subjectId)) break;
        lessonFilter.subjectId = subjectId;
        break;
      }
      case "studentid":
        lessonFilter.class = {
          students: {
            some: { id: param },
          },
        };
        break;
      case "search":
        query.OR = [
          { title: { contains: param, mode: "insensitive" } },
          { lesson: { subject: { name: { contains: param, mode: "insensitive" } } } },
          { lesson: { class: { name: { contains: param, mode: "insensitive" } } } },
          { lesson: { teacher: { name: { contains: param, mode: "insensitive" } } } },
          { lesson: { teacher: { surname: { contains: param, mode: "insensitive" } } } },
        ];
        break;
      default:
        break;
    }
  }

  applyRoleCondition(lessonFilter, roleCondition);

  if (Object.keys(lessonFilter).length > 0) {
    query.lesson = lessonFilter;
  }

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const [assignments, count] = await Promise.all([
    prisma.assignment.findMany({
      where: query,
      include: {
        lesson: {
          select: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
          },
        },
      },
      orderBy: { dueDate: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.assignment.count({ where: query }),
  ]);

  const assignmentsData: Assignment[] = assignments.map((assignment) => ({
    id: assignment.id,
    subject: assignment.lesson.subject.name,
    class: assignment.lesson.class.name,
    teacher: `${assignment.lesson.teacher.name} ${assignment.lesson.teacher.surname}`,
    dueDate: new Intl.DateTimeFormat("en-US").format(assignment.dueDate),
  }));

  const renderRow = (item: Assignment) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.subject}</td>
      <td>{item.class}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      <td className="hidden md:table-cell">{item.dueDate}</td>
      {(role === "admin" || role === "teacher") && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal table="assignment" type="update" data={item} />
            <FormModal table="assignment" type="delete" id={item.id} />
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
          All Assignments
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
            {(role === "admin" || role === "teacher") && (
              <FormModal table="assignment" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={assignmentsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default AssignmentListPage;
