import Announcements from "@/components/Announcements";
import FormModal from "@/components/FormModal";
import Performance from "@/components/Performance";
import { getRole, requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleStudentPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  await requirePermission("students.view");
  const { id } = await params;
  const role = await getRole();

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true } },
      grade: { select: { id: true, level: true } },
      parent: { select: { id: true, name: true, surname: true } },
      _count: { select: { attendances: true, results: true } },
    },
  });

  if (!student) notFound();

  const [presentCount, announcements, grades, classes, parents, recentResults] =
    await Promise.all([
      prisma.attendance.count({ where: { studentId: id, present: true } }),
      prisma.announcement.findMany({
        where: { OR: [{ classId: null }, { classId: student.classId }] },
        orderBy: { date: "desc" },
        take: 3,
      }),
      // Options for the update form's selects.
      role === "admin"
        ? prisma.grade.findMany({ select: { id: true, level: true }, orderBy: { level: "asc" } })
        : Promise.resolve([]),
      role === "admin"
        ? prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      role === "admin"
        ? prisma.parent.findMany({
          select: { id: true, name: true, surname: true },
          orderBy: { name: "asc" },
        })
        : Promise.resolve([]),
      prisma.result.findMany({
        where: { studentId: id },
        select: {
          id: true,
          score: true,
          exam: {
            select: {
              title: true,
              classSubject: {
                select: {
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
          },
          assignment: {
            select: {
              title: true,
              classSubject: {
                select: {
                  subject: { select: { name: true } },
                  class: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { id: "desc" },
        take: 5,
      }),
    ]);

  // Only show a percentage when there's attendance to base it on, rather than
  // rendering a misleading 0% (or 90% placeholder) for students with no records.
  const totalAttendance = student._count.attendances;
  const attendanceLabel =
    totalAttendance > 0
      ? `${Math.round((presentCount / totalAttendance) * 100)}%`
      : "-";

  const dateFormat = new Intl.DateTimeFormat("en-US");
  const monthYearFormat = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });

  const announcementItems = announcements.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    description: announcement.description,
    date: dateFormat.format(announcement.date),
  }));

  // Shape the row the update form expects (see the students list page).
  const formData = {
    id: student.id,
    username: student.username,
    email: student.email,
    firstName: student.name,
    surname: student.surname,
    phone: student.phone,
    address: student.address,
    bloodType: student.bloodType,
    sex: student.sex,
    birthday: student.birthday,
    img: student.img,
    gradeId: student.gradeId,
    classId: student.classId,
    parentId: student.parentId,
  };

  const relatedData = {
    grades: grades.map((grade) => ({
      value: grade.id,
      label: `Grade ${grade.level}`,
    })),
    classes: classes.map((classItem) => ({
      value: classItem.id,
      label: classItem.name,
    })),
    parents: parents.map((parent) => ({
      value: parent.id,
      label: `${parent.name} ${parent.surname}`,
    })),
  };

  return (
    <div className="flex-1 p-4 flex flex-col gap-4 xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        {/* TOP */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* USER INFO CARD */}
          <div className="bg-kamal-sky py-6 px-4 rounded-md flex-1 flex gap-4">
            <div className="w-1/3">
              <Image
                src={student.img || "/avatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {student.name} {student.surname}
                </h1>
                {role === "admin" && (
                  <FormModal
                    table="student"
                    type="update"
                    data={formData}
                    relatedData={relatedData}
                  />
                )}
              </div>
              <p className="text-sm text-gray-500">
                Class {student.class.name} · Grade {student.grade.level} · Parent:{" "}
                {student.parent.name} {student.parent.surname}
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{student.bloodType}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>{monthYearFormat.format(student.birthday)}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{student.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{student.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleAttendance.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{attendanceLabel}</h1>
                <span className="text-sm text-gray-400">Attendance</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {student.grade.level}
                </h1>
                <span className="text-sm text-gray-400">Grade</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleBranch.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {student._count.results}
                </h1>
                <span className="text-sm text-gray-400">Results</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleClass.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">{student.class.name}</h1>
                <span className="text-sm text-gray-400">Class</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4">
          <h1 className="text-xl font-semibold">Recent Results</h1>
          {recentResults.length === 0 ? (
            <p className="text-sm text-gray-400 mt-2">No results yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-200">
              {recentResults.map((result) => {
                const source = result.exam ?? result.assignment;
                if (!source) return null;
                return (
                  <li
                    key={result.id}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">{source.title}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {source.classSubject.subject.name} ·{" "}
                        {source.classSubject.class.name}
                      </span>
                    </div>
                    <span className="text-xs font-medium">{result.score}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-kamal-purple-light"
              href={`/list/teachers?studentId=${student.id}`}
            >
              Student&apos;s Teachers
            </Link>
            <Link
              className="p-3 rounded-md bg-pink-50"
              href={`/list/exams?classId=${student.classId}`}
            >
              Student&apos;s Exams
            </Link>
            <Link
              className="p-3 rounded-md bg-kamal-sky-light"
              href={`/list/assignments?classId=${student.classId}`}
            >
              Student&apos;s Assignments
            </Link>
            <Link
              className="p-3 rounded-md bg-kamal-yellow-light"
              href={`/list/results?studentId=${student.id}`}
            >
              Student&apos;s Results
            </Link>
          </div>
        </div>
        <Performance />
        <Announcements items={announcementItems} />
      </div>
    </div>
  );
};

export default SingleStudentPage;
