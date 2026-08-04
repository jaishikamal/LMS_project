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

type Exam = {
  id: number;
  title: string;
  subject: string;
  className: string;
  date: string;
  // Raw fields the update form needs.
  startTime: Date;
  endTime: Date;
  classSubjectId: number;
};

const baseColumns = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Subject",
    accessor: "subject",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "className",
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

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("exams.view");
  const { role, userId, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const canManage = role === "admin" || role === "teacher";
  const columns = canManage ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.ExamWhereInput = {};

  // Kept separate and AND-merged after the loop so a `classId` query param
  // can't override the role-based scoping.
  const roleCondition: Prisma.ExamWhereInput | null =
    role === "teacher" && userId
      ? { classSubject: { teacherId: userId } }
      : (role === "student" || role === "parent") && classIds
        ? { classSubject: { class: { id: { in: classIds } } } }
        : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.classSubject = { classId };
        break;
      }
      case "teacherid":
        query.classSubject = { teacherId: param };
        break;
      case "studentid":
        query.classSubject = {
          class: { students: { some: { id: param } } },
        };
        break;
      case "search":
        query.OR = [
          { title: { contains: param, mode: "insensitive" } },
          { classSubject: { subject: { name: { contains: param, mode: "insensitive" } } } },
          { classSubject: { class: { name: { contains: param, mode: "insensitive" } } } },
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
  const [exams, count, classSubjects] = await Promise.all([
    prisma.exam.findMany({
      where: query,
      include: {
        classSubject: {
          select: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.exam.count({ where: query }),
    canManage
      ? prisma.classSubject.findMany({
          where: role === "teacher" && userId ? { teacherId: userId } : {},
          select: {
            id: true,
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
          orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
        })
      : Promise.resolve([]),
  ]);

  const relatedData = canManage
    ? {
        classSubjects: classSubjects.map((item) => ({
          value: item.id,
          label: `${item.subject.name} · ${item.class.name}`,
        })),
      }
    : undefined;

  const examsData: Exam[] = exams.map((exam) => ({
    id: exam.id,
    title: exam.title,
    subject: exam.classSubject.subject.name,
    className: exam.classSubject.class.name,
    // Fixed locale so the output does not depend on the server's environment
    date: new Intl.DateTimeFormat("en-US").format(exam.startTime),
    startTime: exam.startTime,
    endTime: exam.endTime,
    classSubjectId: exam.classSubjectId,
  }));

  const renderRow = (item: Exam) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td className="hidden md:table-cell">{item.subject}</td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      {canManage && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal table="exam" type="update" data={item} relatedData={relatedData} />
            <FormModal table="exam" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Exams</h1>
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
                table="exam"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={examsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default ExamListPage;
