import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getRole } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Result = {
  id: number;
  title: string;
  subject: string;
  class: string;
  teacher: string;
  student: string;
  type: "exam" | "assignment";
  date: string;
  score: number;
};

const columns = [
  {
    header: "Subject Name",
    accessor: "name",
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
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "class",
    className: "hidden md:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const ResultListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const role = await getRole();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.ResultWhereInput = {};

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
          { exam: { lesson: { teacherId: param } } },
          { assignment: { lesson: { teacherId: param } } },
        ];
        break;
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.OR = [
          { exam: { lesson: { classId } } },
          { assignment: { lesson: { classId } } },
        ];
        break;
      }
      case "search":
        query.OR = [
          { student: { name: { contains: param, mode: "insensitive" } } },
          { student: { surname: { contains: param, mode: "insensitive" } } },
          { exam: { title: { contains: param, mode: "insensitive" } } },
          { assignment: { title: { contains: param, mode: "insensitive" } } },
        ];
        break;
      default:
        break;
    }
  }

  const [results, count] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        exam: {
          include: {
            lesson: {
              select: {
                subject: { select: { name: true } },
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              select: {
                subject: { select: { name: true } },
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
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
  ]);

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
        subject: source.lesson.subject.name,
        class: source.lesson.class.name,
        teacher: `${source.lesson.teacher.name} ${source.lesson.teacher.surname}`,
        student: `${result.student.name} ${result.student.surname}`,
        type: isExam ? ("exam" as const) : ("assignment" as const),
        date: new Intl.DateTimeFormat("en-US").format(date),
        score: result.score,
      },
    ];
  });

  const renderRow = (item: Result) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.subject}</td>
      <td>{item.student}</td>
      <td className="hidden md:table-cell">{item.score}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      <td className="hidden md:table-cell">{item.class}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormModal table="result" type="update" data={item} />
              <FormModal table="result" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
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
            {(role === "admin" || role === "teacher") && (
              <FormModal table="result" type="create" />
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
