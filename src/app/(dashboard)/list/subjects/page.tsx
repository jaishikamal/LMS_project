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

type Subject = {
  id: number;
  name: string;
  teachers: string[];
  // Ids feed the update form's multi-select; the names above are for display.
  teacherIds: string[];
};

const baseColumns = [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Teachers",
    accessor: "teachers",
    className: "hidden md:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("subjects.view");
  const { role, userId } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns = role === "admin" ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.SubjectWhereInput = {};

  // Kept separate and AND-merged after the loop so a `teacherId` query
  // param can't override the teacher's own scoping.
  const roleCondition: Prisma.SubjectWhereInput | null =
    role === "teacher" && userId
      ? {
        OR: [
          { teachers: { some: { id: userId } } },
          { classSubjects: { some: { teacherId: userId } } },
        ],
      }
      : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "teacherid":
        query.OR = [
          {
            teachers: {
              some: { id: param },
            },
          },
          {
            classSubjects: {
              some: { teacherId: param },
            },
          },
        ];
        break;
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
  const [subjects, count, allTeachers] = await Promise.all([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        classSubjects: {
          select: {
            teacher: { select: { id: true, name: true, surname: true } },
          },
        },
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.subject.count({ where: query }),
    // Options for the form's teacher multi-select.
    role === "admin"
      ? prisma.teacher.findMany({
        select: { id: true, name: true, surname: true },
        orderBy: { name: "asc" },
      })
      : Promise.resolve([]),
  ]);

  const relatedData = {
    teachers: allTeachers.map((teacher) => ({
      value: teacher.id,
      label: `${teacher.name} ${teacher.surname}`,
    })),
  };

  const subjectsData: Subject[] = subjects.map((subject) => {
    // Teachers from the many-to-many plus teachers assigned via ClassSubject.
    const teacherNames = new Set(
      subject.teachers.map((teacher) => `${teacher.name} ${teacher.surname}`)
    );
    const teacherIds = new Set(subject.teachers.map((teacher) => teacher.id));
    subject.classSubjects.forEach((item) => {
      teacherNames.add(`${item.teacher.name} ${item.teacher.surname}`);
      teacherIds.add(item.teacher.id);
    });

    return {
      id: subject.id,
      name: subject.name,
      teachers: [...teacherNames],
      teacherIds: [...teacherIds],
    };
  });

  const renderRow = (item: Subject) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">{item.name}</td>
      <td className="hidden md:table-cell">{item.teachers.join(",")}</td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="subject"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="subject" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Subjects</h1>
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
                table="subject"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={subjectsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default SubjectListPage;
