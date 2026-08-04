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

type LogbookEntry = {
  id: number;
  date: Date;
  topic: string;
  summary: string;
  homework: string | null;
  notes: string | null;
  subject: string;
  className: string;
  teacher: string;
  classSubjectId: number;
};

const baseColumns = [
  { header: "Date", accessor: "date" },
  { header: "Topic", accessor: "topic" },
  { header: "Summary", accessor: "summary", className: "hidden md:table-cell" },
  { header: "Homework", accessor: "homework", className: "hidden lg:table-cell" },
  { header: "Subject", accessor: "subject", className: "hidden lg:table-cell" },
  { header: "Class", accessor: "className", className: "hidden lg:table-cell" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const formatDate = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const LogbookListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("logbook.view");
  const { role, userId, classIds } = await getRoleScope();
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const columns =
    role === "admin" || role === "teacher"
      ? [...baseColumns, actionColumn]
      : baseColumns;

  const query: Prisma.LogbookEntryWhereInput = {};

  if (role === "teacher") {
    query.classSubject = { teacherId: userId! };
  } else if (role !== "admin") {
    query.classSubject = { classId: { in: classIds ?? [] } };
  }

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "classsubjectid": {
        const classSubjectId = Number(param);
        if (!Number.isInteger(classSubjectId)) break;
        query.classSubjectId = classSubjectId;
        break;
      }
      case "search":
        query.OR = [
          { topic: { contains: param, mode: "insensitive" } },
          { summary: { contains: param, mode: "insensitive" } },
          {
            classSubject: {
              subject: { name: { contains: param, mode: "insensitive" } },
            },
          },
        ];
        break;
      default:
        break;
    }
  }

  const classSubjectWhere: Prisma.ClassSubjectWhereInput =
    role === "admin"
      ? {}
      : { teacherId: role === "teacher" ? (userId ?? "__none__") : "__none__" };

  const [entries, count, allClassSubjects] = await Promise.all([
    prisma.logbookEntry.findMany({
      where: query,
      include: {
        classSubject: {
          include: {
            subject: true,
            class: true,
            teacher: true,
          },
        },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.logbookEntry.count({ where: query }),
    role === "admin" || role === "teacher"
      ? prisma.classSubject.findMany({
          where: classSubjectWhere,
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } },
            teacher: { select: { name: true, surname: true } },
          },
          orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
        })
      : Promise.resolve([]),
  ]);

  const relatedData = {
    classSubjects: allClassSubjects.map((item) => ({
      value: item.id,
      label: `${item.class.name} · ${item.subject.name} (${item.teacher.name} ${item.teacher.surname})`,
    })),
  };

  const entriesData: LogbookEntry[] = entries.map((item) => ({
    id: item.id,
    date: item.date,
    topic: item.topic,
    summary: item.summary,
    homework: item.homework,
    notes: item.notes,
    subject: item.classSubject.subject.name,
    className: item.classSubject.class.name,
    teacher: `${item.classSubject.teacher.name} ${item.classSubject.teacher.surname}`,
    classSubjectId: item.classSubjectId,
  }));

  const renderRow = (item: LogbookEntry) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4">{formatDate(item.date)}</td>
      <td>{item.topic}</td>
      <td className="hidden md:table-cell max-w-xs truncate">{item.summary}</td>
      <td className="hidden lg:table-cell">{item.homework || "—"}</td>
      <td className="hidden lg:table-cell">{item.subject}</td>
      <td className="hidden lg:table-cell">{item.className}</td>
      {(role === "admin" || role === "teacher") && (
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="logbook"
              type="update"
              data={item}
              relatedData={relatedData}
            />
            <FormModal table="logbook" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Teaching Logbook
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
            {(role === "admin" || role === "teacher") && (
              <FormModal
                table="logbook"
                type="create"
                relatedData={relatedData}
              />
            )}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={entriesData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default LogbookListPage;
