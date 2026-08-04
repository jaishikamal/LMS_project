import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { gradeFromScore } from "@/lib/grades";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRoleCondition, getRoleScope } from "@/lib/roleScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";

type Result = {
  id: number;
  title: string;
  subject: string;
  className: string;
  student: string;
  type: "exam" | "assignment";
  date: string;
  score: number;
  // Raw fields the update form needs.
  studentId: string;
  examId: number | null;
  assignmentId: number | null;
};

const baseColumns = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Student",
    accessor: "student",
  },
  {
    header: "Score",
    accessor: "score",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Subject",
    accessor: "subject",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "className",
    className: "hidden md:table-cell",
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

const ResultListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("results.view");
  const { role, userId, classIds, studentIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const canManage = role === "admin" || role === "teacher";
  const columns = canManage ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.ResultWhereInput = {};

  // Kept separate and AND-merged after the loop (rather than reusing
  // `query.OR`, which the "teacherid"/"classid"/"search" params below
  // already use) so it can't be overwritten by any of those params.
  const roleCondition: Prisma.ResultWhereInput | null =
    (role === "student" || role === "parent") && studentIds
      ? { studentId: { in: studentIds } }
      : role === "teacher" && userId
        ? {
          OR: [
            { exam: { classSubject: { teacherId: userId } } },
            { assignment: { classSubject: { teacherId: userId } } },
          ],
        }
        : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "studentid":
        query.studentId = param;
        break;
      // A result hangs off either an exam or an assignment, so relation
      // filters have to consider both sides.
      case "teacherid":
        query.OR = [
          { exam: { classSubject: { teacherId: param } } },
          { assignment: { classSubject: { teacherId: param } } },
        ];
        break;
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.OR = [
          { exam: { classSubject: { classId } } },
          { assignment: { classSubject: { classId } } },
        ];
        break;
      }
      case "search":
        query.OR = [
          { student: { name: { contains: param, mode: "insensitive" } } },
          { student: { surname: { contains: param, mode: "insensitive" } } },
          { exam: { title: { contains: param, mode: "insensitive" } } },
          { assignment: { title: { contains: param, mode: "insensitive" } } },
          { exam: { classSubject: { subject: { name: { contains: param, mode: "insensitive" } } } } },
          { assignment: { classSubject: { subject: { name: { contains: param, mode: "insensitive" } } } } },
        ];
        break;
      default:
        break;
    }
  }

  applyRoleCondition(query, roleCondition);

  const scopedClassIds = classIds ?? [];

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const [results, count, scopedExams, scopedAssignments, scopedStudents] =
    await Promise.all([
      prisma.result.findMany({
        where: query,
        include: {
          student: { select: { name: true, surname: true } },
          exam: {
            select: {
              title: true,
              startTime: true,
              classSubject: {
                select: {
                  classId: true,
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
          },
          assignment: {
            select: {
              title: true,
              dueDate: true,
              classSubject: {
                select: {
                  classId: true,
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (page - 1),
      }),
      prisma.result.count({ where: query }),
      // Options for the result form's assessment select.
      canManage
        ? prisma.exam.findMany({
            where: role === "teacher" && userId
              ? { classSubject: { teacherId: userId } }
              : {},
            select: {
              id: true,
              title: true,
              classSubject: {
                select: {
                  classId: true,
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
            orderBy: { id: "desc" },
          })
        : Promise.resolve([]),
      canManage
        ? prisma.assignment.findMany({
            where: role === "teacher" && userId
              ? { classSubject: { teacherId: userId } }
              : {},
            select: {
              id: true,
              title: true,
              classSubject: {
                select: {
                  classId: true,
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
            orderBy: { id: "desc" },
          })
        : Promise.resolve([]),
      canManage
        ? prisma.student.findMany({
            where: role === "teacher" && classIds
              ? { classId: { in: scopedClassIds } }
              : {},
            select: {
              id: true,
              name: true,
              surname: true,
              class: { select: { name: true } },
              classId: true,
            },
            orderBy: [{ surname: "asc" }, { name: "asc" }],
          })
        : Promise.resolve([]),
    ]);

  const relatedData = canManage
    ? {
        assessments: [
          ...scopedExams.map((exam) => ({
            value: `exam:${exam.id}`,
            label: `${exam.title} (Exam) · ${exam.classSubject.subject.name} · ${exam.classSubject.class.name}`,
            classId: exam.classSubject.classId,
          })),
          ...scopedAssignments.map((assignment) => ({
            value: `assignment:${assignment.id}`,
            label: `${assignment.title} (Assignment) · ${assignment.classSubject.subject.name} · ${assignment.classSubject.class.name}`,
            classId: assignment.classSubject.classId,
          })),
        ],
        resultStudents: scopedStudents.map((student) => ({
          value: student.id,
          label: `${student.name} ${student.surname} · ${student.class.name}`,
          classId: student.classId,
        })),
      }
    : undefined;

  const resultsData: Result[] = results.flatMap((result) => {
    // Both relations are optional in the schema; skip orphaned rows rather
    // than rendering blanks.
    const source = result.exam ?? result.assignment;
    if (!source) return [];

    const isExam = result.exam !== null;
    const date = result.exam ? result.exam.startTime : result.assignment!.dueDate;

    return [
      {
        id: result.id,
        title: source.title,
        subject: source.classSubject.subject.name,
        className: source.classSubject.class.name,
        student: `${result.student.name} ${result.student.surname}`,
        type: isExam ? ("exam" as const) : ("assignment" as const),
        date: new Intl.DateTimeFormat("en-US").format(date),
        score: result.score,
        studentId: result.studentId,
        examId: result.examId,
        assignmentId: result.assignmentId,
      },
    ];
  });

  const renderRow = (item: Result) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{item.student}</td>
      <td className="hidden md:table-cell">{item.score}</td>
      <td className="hidden md:table-cell font-medium">{gradeFromScore(item.score)}</td>
      <td className="hidden md:table-cell">{item.subject}</td>
      <td className="hidden md:table-cell">{item.className}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      {canManage && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="result"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="result" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Results</h1>
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
                table="result"
                type="create"
                relatedData={relatedData}
              />
            )}
            {canManage && (
              <Link
                href="/list/results/bulk"
                className="bg-kamal-sky text-white text-sm px-4 py-2 rounded-md"
              >
                Bulk Entry
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={resultsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default ResultListPage;
