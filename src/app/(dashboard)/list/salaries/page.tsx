import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type SalaryRecord = {
  id: number;
  recipient: string;
  recipientType: string;
  month: Date;
  amount: number;
  paid: boolean;
  paidDate: Date | null;
};

const baseColumns = [
  { header: "Recipient", accessor: "recipient" },
  { header: "Type", accessor: "recipientType" },
  { header: "Month", accessor: "month" },
  { header: "Amount", accessor: "amount" },
  { header: "Status", accessor: "paid" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const formatMonth = (value: Date) => {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatDate = (value: Date | null) => {
  if (!value) return "—";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const formatMoney = (value: number) =>
  `रु ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const SalaryListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("salaries.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.SalaryRecordWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { staff: { name: { contains: param, mode: "insensitive" } } },
          { staff: { surname: { contains: param, mode: "insensitive" } } },
          { teacher: { name: { contains: param, mode: "insensitive" } } },
          { teacher: { surname: { contains: param, mode: "insensitive" } } },
        ];
        break;
      default:
        break;
    }
  }

  const [salaries, count] = await Promise.all([
    prisma.salaryRecord.findMany({
      where: query,
      include: {
        staff: { select: { name: true, surname: true } },
        teacher: { select: { name: true, surname: true } },
      },
      orderBy: [{ month: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.salaryRecord.count({ where: query }),
  ]);

  const salaryData: SalaryRecord[] = salaries.map((item) => ({
    id: item.id,
    recipient:
      item.recipientType === "Staff"
        ? `${item.staff?.name} ${item.staff?.surname}`
        : `${item.teacher?.name} ${item.teacher?.surname}`,
    recipientType: item.recipientType,
    month: item.month,
    amount: Number(item.amount),
    paid: item.paid,
    paidDate: item.paidDate,
  }));

  const staff = await prisma.staff.findMany({
    select: { id: true, name: true, surname: true },
    orderBy: { name: "asc" },
  });
  const teachers = await prisma.teacher.findMany({
    select: { id: true, name: true, surname: true },
    orderBy: { name: "asc" },
  });
  const staffOptions = staff.map((item) => ({
    value: item.id,
    label: `${item.name} ${item.surname}`,
  }));
  const teacherOptions = teachers.map((item) => ({
    value: item.id,
    label: `${item.name} ${item.surname}`,
  }));

  const renderRow = (item: SalaryRecord) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.recipient}</td>
      <td>{item.recipientType}</td>
      <td>{formatMonth(item.month)}</td>
      <td>{formatMoney(item.amount)}</td>
      <td>
        <span
          className={`px-2 py-1 rounded-md text-xs font-semibold ${item.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
        >
          {item.paid ? `Paid ${formatDate(item.paidDate)}` : "Unpaid"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal
            table="salary"
            type="update"
            data={item}
            relatedData={{ staff: staffOptions, teachers: teacherOptions }}
          />
          <FormModal table="salary" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Salaries</h1>
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
              table="salary"
              type="create"
              relatedData={{ staff: staffOptions, teachers: teacherOptions }}
            />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={salaryData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default SalaryListPage;
