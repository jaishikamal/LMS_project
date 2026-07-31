import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getRole } from "@/lib/auth";
import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Exam = {
  id: number;
  subject: string;
  class: string;
  teacher: string;
  date: string;
};

const columns = [
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
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: "Actions",
    accessor: "action",
  },
];

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const role = await getRole();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.ExamWhereInput = {};
  // Exam has no direct class/teacher/subject columns, so all of these
  // filters go through the related lesson.
  const lessonFilter: Prisma.LessonWhereInput = {};

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

  if (Object.keys(lessonFilter).length > 0) {
    query.lesson = lessonFilter;
  }

  const [exams, count] = await prisma.$transaction([
    prisma.exam.findMany({
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
      orderBy: { startTime: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.exam.count({ where: query }),
  ]);

  const examsData: Exam[] = exams.map((exam) => ({
    id: exam.id,
    subject: exam.lesson.subject.name,
    class: exam.lesson.class.name,
    teacher: `${exam.lesson.teacher.name} ${exam.lesson.teacher.surname}`,
    // Fixed locale so the output does not depend on the server's environment
    date: new Intl.DateTimeFormat("en-US").format(exam.startTime),
  }));

  const renderRow = (item: Exam) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.subject}</td>
      <td>{item.class}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      <td>
        <div className="flex items-center gap-2">
          {(role === "admin" || role === "teacher") && (
            <>
              <FormModal table="exam" type="update" data={item} />
              <FormModal table="exam" type="delete" id={item.id} />
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
            {(role === "admin" || role === "teacher") && (
              <FormModal table="exam" type="create" />
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
