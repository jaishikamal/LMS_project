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

type Teacher = {
  id: string;
  teacherId: string;
  name: string;
  email?: string | null;
  photo: string;
  phone: string | null;
  subjects: string[];
  classes: string[];
  address: string;
  // Raw values for the update form (see the mapping below).
  username: string;
  firstName: string;
  surname: string;
  bloodType: string;
  sex: UserSex;
  birthday: Date;
  img: string | null;
  subjectIds: number[];
};

const baseColumns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Teacher ID",
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: "Classes",
    accessor: "classes",
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

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("teachers.view");
  const { role, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns = role === "student" ? baseColumns : [...baseColumns, actionColumn];

  // Build the Prisma filter from the URL query params
  const query: Prisma.TeacherWhereInput = {};

  // Teachers only see colleagues who supervise or teach within their own
  // classes (supervised + taught, per the role scope). Kept as a separate
  // AND clause (applied below) so it can't be overwritten by a
  // `classId`/`subjectId` query param targeting the same field.
  const roleCondition: Prisma.TeacherWhereInput | null =
    role === "teacher" && classIds
      ? {
        OR: [
          { classes: { some: { id: { in: classIds } } } },
          { classSubjects: { some: { classId: { in: classIds } } } },
        ],
      }
      : null;

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    // Match keys case-insensitively so ?classId=3 and ?classid=3 both work
    switch (rawKey.toLowerCase()) {
      // Only show teachers who teach or supervise this student's class
      case "studentid":
        query.OR = [
          {
            classes: {
              some: {
                students: {
                  some: { id: param },
                },
              },
            },
          },
          {
            classSubjects: {
              some: {
                class: {
                  students: {
                    some: { id: param },
                  },
                },
              },
            },
          },
        ];
        break;
      // Only show teachers who teach or supervise this class
      case "classid": {
        const classId = Number(param);
        if (!Number.isInteger(classId)) break;
        query.OR = [
          {
            classes: {
              some: { id: classId },
            },
          },
          {
            classSubjects: {
              some: { classId },
            },
          },
        ];
        break;
      }
      case "subjectid": {
        const subjectId = Number(param);
        if (!Number.isInteger(subjectId)) break;
        query.OR = [
          {
            subjects: {
              some: { id: subjectId },
            },
          },
          {
            classSubjects: {
              some: { subjectId },
            },
          },
        ];
        break;
      }
      case "search": {
        // Match every word against any field, so "TName1 TSurname1"
        // (the full name shown in the table) also matches.
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
  const [teachers, count, allSubjects] = await Promise.all([
    prisma.teacher.findMany({
      where: query,
      include: {
        subjects: true,
        classes: true,
        classSubjects: {
          select: { class: { select: { name: true } } },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.teacher.count({ where: query }),
    // Options for the form's subject multi-select.
    role === "admin"
      ? prisma.subject.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
      : Promise.resolve([]),
  ]);

  const relatedData = {
    subjects: allSubjects.map((subject) => ({
      value: subject.id,
      label: subject.name,
    })),
  };

  const teachersData: Teacher[] = teachers.map((teacher) => {
    // Supervised classes plus classes they teach a subject in.
    const classNames = new Set<string>(teacher.classes.map((classItem) => classItem.name));
    teacher.classSubjects.forEach((item) => classNames.add(item.class.name));

    return {
      id: teacher.id,
      teacherId: teacher.username,
      name: `${teacher.name} ${teacher.surname}`,
      email: teacher.email,
      photo: teacher.img || "/avatar.png",
      phone: teacher.phone,
      subjects: teacher.subjects.map((subject) => subject.name),
      classes: [...classNames],
      address: teacher.address,
      // Raw fields the update form needs (the display values above are joined
      // or renamed, so they can't be reused for form defaults).
      username: teacher.username,
      firstName: teacher.name,
      surname: teacher.surname,
      bloodType: teacher.bloodType,
      sex: teacher.sex,
      birthday: teacher.birthday,
      // Raw column (not the avatar-fallback `photo` above) so the update form
      // can preview the existing upload and keep it on save.
      img: teacher.img,
      subjectIds: teacher.subjects.map((subject) => subject.id),
    };
  });

  const renderRow = (item: Teacher) => (
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
          <p className="text-xs text-gray-500">{item?.email}</p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.teacherId}</td>
      <td className="hidden md:table-cell">{item.subjects.join(",")}</td>
      <td className="hidden md:table-cell">{item.classes.join(",")}</td>
      <td className="hidden md:table-cell">{item.phone}</td>
      <td className="hidden md:table-cell">{item.address}</td>
      {role !== "student" && (
        <td>
          <div className="flex items-center gap-2">
            <Link href={`/list/teachers/${item.id}`}>
              <button className="w-7 h-7 flex items-center justify-center rounded-full bg-kamal-sky">
                <Image src="/view.png" alt="" width={16} height={16} />
              </button>
            </Link>
            {role === "admin" && (
              <>
                <FormModal
                  table="teacher"
                  type="update"
                  data={item}
                  relatedData={relatedData}
                />
                <FormModal table="teacher" type="delete" id={item.id} />
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
        <h1 className="hidden md:block text-lg font-semibold">All Teachers</h1>
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
                table="teacher"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={teachersData} />
      {/* PAGINATION */}
      <Pagination page={page} count={count} />
    </div>
  );
};

export default TeacherListPage;
