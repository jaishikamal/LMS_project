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
import Link from "next/link";

type Attendance = {
  id: number;
  student: string;
  subject: string;
  className: string;
  date: string;
  status: string;
  present: boolean;
  // Raw fields the update form needs.
  dateAt: Date;
  studentId: string;
  classSubjectId: number;
};

const baseColumns = [
  {
    header: "Student",
    accessor: "student",
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
  {
    header: "Status",
    accessor: "status",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("attendance.view");
  const { role, userId, classIds, studentIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const canManage = role === "admin" || role === "teacher";
  const columns = canManage ? [...baseColumns, actionColumn] : baseColumns;

  const query: Prisma.AttendanceWhereInput = {};

  // Kept separate and AND-merged after the loop so a `classId` query param
  // can't override the role-based scoping.
  const roleCondition: Prisma.AttendanceWhereInput | null =
    role === "teacher" && userId
      ? { classSubject: { teacherId: userId } }
      : (role === "student" || role === "parent") && studentIds
        ? { studentId: { in: studentIds } }
        : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "studentid":
        query.studentId = param;
        break;
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.classSubject = { classId };
        break;
      }
      case "teacherid":
        query.classSubject = { teacherId: param };
        break;
      case "search":
        query.OR = [
          { student: { name: { contains: param, mode: "insensitive" } } },
          { student: { surname: { contains: param, mode: "insensitive" } } },
          { classSubject: { subject: { name: { contains: param, mode: "insensitive" } } } },
          { classSubject: { class: { name: { contains: param, mode: "insensitive" } } } },
        ];
        break;
      default:
        break;
    }
  }

  applyRoleCondition(query, roleCondition);

  const scopedClassIds = classIds ?? [];

  const [attendances, count, classSubjects, students] = await Promise.all([
    prisma.attendance.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        classSubject: {
          select: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.attendance.count({ where: query }),
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
          },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const relatedData = canManage
    ? {
        classSubjects: classSubjects.map((item) => ({
          value: item.id,
          label: `${item.subject.name} · ${item.class.name}`,
        })),
        students: students.map((student) => ({
          value: student.id,
          label: `${student.name} ${student.surname} · ${student.class.name}`,
        })),
      }
    : undefined;

  const attendancesData: Attendance[] = attendances.map((row) => ({
    id: row.id,
    student: `${row.student.name} ${row.student.surname}`,
    subject: row.classSubject.subject.name,
    className: row.classSubject.class.name,
    date: new Intl.DateTimeFormat("en-US").format(row.date),
    status: row.present ? "Present" : "Absent",
    present: row.present,
    dateAt: row.date,
    studentId: row.studentId,
    classSubjectId: row.classSubjectId,
  }));

  const renderRow = (item: Attendance) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">
        <h3 className="font-semibold">{item.student}</h3>
      </td>
      <td className="hidden md:table-cell">{item.subject}</td>
      <td className="hidden md:table-cell">{item.className}</td>
      <td className="hidden md:table-cell">{item.date}</td>
      <td>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.present
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {item.status}
        </span>
      </td>
      {canManage && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="attendance"
              type="update"
              data={{
                id: item.id,
                date: item.dateAt,
                present: item.present,
                studentId: item.studentId,
                classSubjectId: item.classSubjectId,
              }}
              relatedData={relatedData}
            />
            <FormModal table="attendance" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Attendance</h1>
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
              <Link
                href="/list/attendance/take"
                className="bg-kamal-sky text-white text-sm px-4 py-2 rounded-md"
              >
                Take Attendance
              </Link>
            )}
            {canManage && (
              <FormModal
                table="attendance"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={attendancesData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default AttendanceListPage;
