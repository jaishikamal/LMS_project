import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma, UserSex } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { applyRoleCondition, getRoleScope } from "@/lib/roleScope";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";

type Student = {
  id: string;
  studentId: string;
  name: string;
  email?: string | null;
  photo: string;
  phone?: string | null;
  grade: number;
  class: string;
  address: string;
  // Raw values for the update form (see the mapping below).
  username: string;
  firstName: string;
  surname: string;
  bloodType: string;
  sex: UserSex;
  birthday: Date;
  img: string | null;
  gradeId: number;
  classId: number;
  parentId: string;
};

const baseColumns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student ID",
    accessor: "studentId",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("students.view");
  const { role, classIds, studentIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns = role === "student" ? baseColumns : [...baseColumns, actionColumn];

  const query: Prisma.StudentWhereInput = {};

  // Teachers see students in their own classes; students see only
  // themselves; parents see only their own children. Kept separate and
  // AND-merged after the loop so a `classId`/`studentId` query param can't
  // override it.
  const roleCondition: Prisma.StudentWhereInput | null =
    role === "teacher" && classIds
      ? { classId: { in: classIds } }
      : (role === "student" || role === "parent") && studentIds
        ? { id: { in: studentIds } }
        : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      // Students taught by this teacher (supervised or via ClassSubject)
      case "teacherid":
        query.OR = [
          {
            class: {
              supervisorId: param,
            },
          },
          {
            class: {
              classSubjects: {
                some: { teacherId: param },
              },
            },
          },
        ];
        break;
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.classId = classId;
        break;
      }
      case "gradeid": {
        const gradeId = Number(param);
        if (!Number.isInteger(gradeId)) break;
        query.gradeId = gradeId;
        break;
      }
      case "parentid":
        query.parentId = param;
        break;
      case "search": {
        const terms = param.split(/\s+/).filter(Boolean);
        query.AND = terms.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { surname: { contains: term, mode: "insensitive" } },
            { username: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        }));
        break;
      }
      default:
        break;
    }
  }

  applyRoleCondition(query, roleCondition);

  // Independent read-only queries: Promise.all avoids the interactive
  // transaction timeout that $transaction([...]) would impose on a remote
  // pooled connection.
  const isAdmin = role === "admin";

  const [students, count, allGrades, allClasses, allParents] = await Promise.all([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
        grade: true,
      },
      orderBy: { username: "asc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.student.count({ where: query }),
    // Options for the form's grade/class/parent selects.
    isAdmin
      ? prisma.grade.findMany({ select: { id: true, level: true }, orderBy: { level: "asc" } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    isAdmin
      ? prisma.parent.findMany({
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
    classes: allClasses.map((classItem) => ({
      value: classItem.id,
      label: classItem.name,
    })),
    parents: allParents.map((parent) => ({
      value: parent.id,
      label: `${parent.name} ${parent.surname}`,
    })),
  };

  const studentsData: Student[] = students.map((student) => ({
    id: student.id,
    studentId: student.username,
    name: `${student.name} ${student.surname}`,
    email: student.email,
    photo: student.img || "/avatar.png",
    phone: student.phone,
    grade: student.grade.level,
    class: student.class.name,
    address: student.address,
    // Raw fields the update form needs (display values above are joined).
    username: student.username,
    firstName: student.name,
    surname: student.surname,
    bloodType: student.bloodType,
    sex: student.sex,
    birthday: student.birthday,
    // Raw column (not the avatar-fallback `photo` above) so the update form
    // can preview the existing upload and keep it on save.
    img: student.img,
    gradeId: student.gradeId,
    classId: student.classId,
    parentId: student.parentId,
  }));

  const renderRow = (item: Student) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.photo}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{item.name}</h3>
          <p className="text-xs text-gray-500">{item.class}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.studentId}</td>
      <td className="hidden md:table-cell">{item.grade}</td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      {role !== "student" && (
        <td>
          <div className="flex items-center gap-2">
            <Link href={`/list/students/${item.id}`}>
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-kamal-sky">
                <Image src="/view.png" alt="" width={16} height={16} />
              </button>
            </Link>
            {role === "admin" && (
              <>
                <FormModal
                  table="student"
                  type="update"
                  data={item}
                  relatedData={relatedData}
                />
                <FormModal table="student" type="delete" id={item.id} />
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Students</h1>
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
                table="student"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={studentsData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default StudentListPage;
