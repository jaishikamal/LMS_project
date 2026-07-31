import Announcements from "@/components/Announcements";
import BigCalendar from "@/components/BigCalender";
import FormModal from "@/components/FormModal";
import Performance from "@/components/Performance";
import { getRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getScheduleEvents } from "@/lib/schedule";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const SingleTeacherPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const role = await getRole();

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      subjects: { select: { id: true, name: true } },
      classes: { select: { id: true, name: true } },
      _count: { select: { lessons: true, classes: true, subjects: true } },
    },
  });

  if (!teacher) notFound();

  // Classes reached through lessons, not just the ones they supervise.
  const taughtClasses = await prisma.class.findMany({
    where: { lessons: { some: { teacherId: id } } },
    select: { id: true },
  });
  const classIds = Array.from(
    new Set([...taughtClasses.map((c) => c.id), ...teacher.classes.map((c) => c.id)])
  );

  const [studentCount, scheduleEvents, announcements, allSubjects] =
    await Promise.all([
      prisma.student.count({ where: { classId: { in: classIds } } }),
      // This teacher's schedule is the lessons they personally teach.
      getScheduleEvents({ teacherId: id }),
      prisma.announcement.findMany({
        where: { OR: [{ classId: null }, { classId: { in: classIds } }] },
        orderBy: { date: "desc" },
        take: 3,
      }),
      // Options for the update form's subject multi-select.
      role === "admin"
        ? prisma.subject.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
        : Promise.resolve([]),
    ]);

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

  // Shape the row the update form expects (see the teachers list page).
  const formData = {
    id: teacher.id,
    username: teacher.username,
    email: teacher.email,
    firstName: teacher.name,
    surname: teacher.surname,
    phone: teacher.phone,
    address: teacher.address,
    bloodType: teacher.bloodType,
    sex: teacher.sex,
    birthday: teacher.birthday,
    img: teacher.img,
    subjectIds: teacher.subjects.map((subject) => subject.id),
  };

  const relatedData = {
    subjects: allSubjects.map((subject) => ({
      value: subject.id,
      label: subject.name,
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
                src={teacher.img || "/avatar.png"}
                alt=""
                width={144}
                height={144}
                className="w-36 h-36 rounded-full object-cover"
              />
            </div>
            <div className="w-2/3 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">
                  {teacher.name} {teacher.surname}
                </h1>
                {role === "admin" && (
                  <FormModal
                    table="teacher"
                    type="update"
                    data={formData}
                    relatedData={relatedData}
                  />
                )}
              </div>
              <p className="text-sm text-gray-500">
                {teacher.subjects.length > 0
                  ? `Teaches ${teacher.subjects.map((s) => s.name).join(", ")}.`
                  : "No subjects assigned yet."}
              </p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium">
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/blood.png" alt="" width={14} height={14} />
                  <span>{teacher.bloodType}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/date.png" alt="" width={14} height={14} />
                  <span>{monthYearFormat.format(teacher.birthday)}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/mail.png" alt="" width={14} height={14} />
                  <span>{teacher.email || "-"}</span>
                </div>
                <div className="w-full md:w-1/3 lg:w-full 2xl:w-1/3 flex items-center gap-2">
                  <Image src="/phone.png" alt="" width={14} height={14} />
                  <span>{teacher.phone || "-"}</span>
                </div>
              </div>
            </div>
          </div>
          {/* SMALL CARDS */}
          <div className="flex-1 flex gap-4 justify-between flex-wrap">
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
                  {teacher._count.subjects}
                </h1>
                <span className="text-sm text-gray-400">Subjects</span>
              </div>
            </div>
            {/* CARD */}
            <div className="bg-white p-4 rounded-md flex gap-4 w-full md:w-[48%] xl:w-[45%] 2xl:w-[48%]">
              <Image
                src="/singleLesson.png"
                alt=""
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <div className="">
                <h1 className="text-xl font-semibold">
                  {teacher._count.lessons}
                </h1>
                <span className="text-sm text-gray-400">Lessons</span>
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
                <h1 className="text-xl font-semibold">{classIds.length}</h1>
                <span className="text-sm text-gray-400">Classes</span>
              </div>
            </div>
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
                <h1 className="text-xl font-semibold">{studentCount}</h1>
                <span className="text-sm text-gray-400">Students</span>
              </div>
            </div>
          </div>
        </div>
        {/* BOTTOM */}
        <div className="mt-4 bg-white rounded-md p-4 h-[800px]">
          <h1>Teacher&apos;s Schedule</h1>
          <BigCalendar events={scheduleEvents} />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-4">
        <div className="bg-white p-4 rounded-md">
          <h1 className="text-xl font-semibold">Shortcuts</h1>
          <div className="mt-4 flex gap-4 flex-wrap text-xs text-gray-500">
            <Link
              className="p-3 rounded-md bg-kamal-sky-light"
              href={`/list/classes?teacherId=${teacher.id}`}
            >
              Teacher&apos;s Classes
            </Link>
            <Link
              className="p-3 rounded-md bg-kamal-purple-light"
              href={`/list/students?teacherId=${teacher.id}`}
            >
              Teacher&apos;s Students
            </Link>
            <Link
              className="p-3 rounded-md bg-kamal-yellow-light"
              href={`/list/lessons?teacherId=${teacher.id}`}
            >
              Teacher&apos;s Lessons
            </Link>
            <Link
              className="p-3 rounded-md bg-pink-50"
              href={`/list/exams?teacherId=${teacher.id}`}
            >
              Teacher&apos;s Exams
            </Link>
            <Link
              className="p-3 rounded-md bg-kamal-sky-light"
              href={`/list/assignments?teacherId=${teacher.id}`}
            >
              Teacher&apos;s Assignments
            </Link>
          </div>
        </div>
        <Performance />
        <Announcements items={announcementItems} />
      </div>
    </div>
  );
};

export default SingleTeacherPage;
