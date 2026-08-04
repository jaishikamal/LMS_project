import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";
import Link from "next/link";

type AttendanceRecord = {
  id: number;
  date: Date;
  present: boolean;
  status: string;
  staffName: string;
  role: string;
  staffId: string;
};

const baseColumns = [
  { header: "Staff", accessor: "staffName" },
  { header: "Role", accessor: "role", className: "hidden md:table-cell" },
  { header: "Date", accessor: "date" },
  { header: "Status", accessor: "status" },
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

const statusClass = (status: string) => {
  if (status === "Present") return "text-green-600";
  if (status === "Leave") return "text-yellow-600";
  return "text-red-600";
};

const StaffAttendanceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("staff.attendance.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.StaffAttendanceWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "staffid":
        query.staffId = param;
        break;
      case "status":
        query.status = param;
        break;
      case "search":
        query.staff = {
          OR: [
            { name: { contains: param, mode: "insensitive" } },
            { surname: { contains: param, mode: "insensitive" } },
          ],
        };
        break;
      default:
        break;
    }
  }

  const [records, count, allStaff] = await Promise.all([
    prisma.staffAttendance.findMany({
      where: query,
      include: { staff: { select: { name: true, surname: true, role: true } } },
      orderBy: [{ date: "desc" }, { staff: { name: "asc" } }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.staffAttendance.count({ where: query }),
    prisma.staff.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const relatedData = {
    staff: allStaff.map((staff) => ({
      value: staff.id,
      label: `${staff.name} ${staff.surname}`,
    })),
  };

  const recordsData: AttendanceRecord[] = records.map((item) => ({
    id: item.id,
    date: item.date,
    present: item.present,
    status: item.status,
    staffName: `${item.staff.name} ${item.staff.surname}`,
    role: item.staff.role,
    staffId: item.staffId,
  }));

  const renderRow = (item: AttendanceRecord) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.staffName}</td>
      <td className="hidden md:table-cell">{item.role}</td>
      <td>{formatDate(item.date)}</td>
      <td className={statusClass(item.status)}>{item.status}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal
            table="staffAttendance"
            type="update"
            data={item}
            relatedData={relatedData}
          />
          <FormModal table="staffAttendance" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Staff Attendance</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal
              table="staffAttendance"
              type="create"
              relatedData={relatedData}
            />
            <Link
              href="/list/staff/attendance/take"
              className="bg-kamal-sky text-white text-sm px-4 py-2 rounded-md"
            >
              Mark Today
            </Link>
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={recordsData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default StaffAttendanceListPage;
