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

type ClassSubject = {
  id: number;
  subject: string;
  className: string;
  teacher: string;
  // Raw ids feed the update form's selects; the names above are for display.
  subjectId: number;
  classId: number;
  teacherId: string;
};

const baseColumns = [
  {
    header: "Subject",
    accessor: "subject",
  },
  {
    header: "Class",
    accessor: "className",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const ClassSubjectListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("classSubjects.view");
  const { role } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns =
    role === "admin" ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.ClassSubjectWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "subjectid": {
        const subjectId = Number(param);
        if (!Number.isInteger(subjectId)) break;
        query.subjectId = subjectId;
        break;
      }
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.classId = classId;
        break;
      }
      case "teacherid":
        query.teacherId = param;
        break;
      case "search":
        query.OR = [
          { subject: { name: { contains: param, mode: "insensitive" } } },
          { class: { name: { contains: param, mode: "insensitive" } } },
          {
            teacher: {
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

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const [classSubjects, count, allSubjects, allClasses, allTeachers] =
    await Promise.all([
      prisma.classSubject.findMany({
        where: query,
        include: {
          subject: true,
          class: true,
          teacher: true,
        },
        orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (page - 1),
      }),
      prisma.classSubject.count({ where: query }),
      // Options for the form's selects.
      role === "admin"
        ? prisma.subject.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      role === "admin"
        ? prisma.class.findMany({
            select: { id: true, name: true, grade: { select: { level: true } } },
            orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
          })
        : Promise.resolve([]),
      role === "admin"
        ? prisma.teacher.findMany({
            select: { id: true, name: true, surname: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

  const relatedData = {
    subjects: allSubjects.map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
    classes: allClasses.map((classItem) => ({
      value: classItem.id,
      label: `${classItem.name} · Grade ${classItem.grade.level}`,
    })),
    teachers: allTeachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} ${teacher.surname}`,
    })),
  };

  const classSubjectsData: ClassSubject[] = classSubjects.map((item) => ({
    id: item.id,
    subject: item.subject.name,
    className: item.class.name,
    teacher: `${item.teacher.name} ${item.teacher.surname}`,
    subjectId: item.subjectId,
    classId: item.classId,
    teacherId: item.teacherId,
  }));

  const renderRow = (item: ClassSubject) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.subject}</td>
      <td>{item.className}</td>
      <td className="hidden md:table-cell">{item.teacher}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="classSubject"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="classSubject" type="delete" id={item.id} />
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
          All Class Subjects
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
                table="classSubject"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={classSubjectsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default ClassSubjectListPage;
