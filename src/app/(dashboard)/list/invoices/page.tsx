import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Invoice = {
  id: number;
  invoiceNo: string;
  studentName: string;
  feeItem: string;
  amount: number;
  paid: number;
  dueDate: Date;
  status: string;
};

const baseColumns = [
  { header: "Invoice No", accessor: "invoiceNo" },
  { header: "Student", accessor: "studentName" },
  { header: "Fee Item", accessor: "feeItem" },
  { header: "Amount", accessor: "amount" },
  { header: "Paid", accessor: "paid", className: "hidden md:table-cell" },
  { header: "Due", accessor: "dueDate", className: "hidden lg:table-cell" },
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

const formatMoney = (value: number) =>
  `रु ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusColor = (status: string) =>
  status === "Paid"
    ? "bg-green-100 text-green-800"
    : status === "Partial"
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

const InvoiceListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("invoices.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.InvoiceWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { invoiceNo: { contains: param, mode: "insensitive" } },
          { student: { name: { contains: param, mode: "insensitive" } } },
          { student: { surname: { contains: param, mode: "insensitive" } } },
        ];
        break;
      default:
        break;
    }
  }

  const [invoices, count] = await Promise.all([
    prisma.invoice.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        feeItem: { select: { name: true } },
        payments: { select: { amount: true } },
      },
      orderBy: [{ issuedAt: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.invoice.count({ where: query }),
  ]);

  const invoiceData: Invoice[] = invoices.map((item) => ({
    id: item.id,
    invoiceNo: item.invoiceNo,
    studentName: `${item.student.name} ${item.student.surname}`,
    feeItem: item.feeItem.name,
    amount: Number(item.amount),
    paid: Number(item.payments.reduce((sum, p) => sum + Number(p.amount), 0)),
    dueDate: item.dueDate,
    status: item.status,
  }));

  const students = await prisma.student.findMany({
    select: { id: true, name: true, surname: true },
    orderBy: { name: "asc" },
  });
  const feeItems = await prisma.feeItem.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const studentOptions = students.map((item) => ({
    value: item.id,
    label: `${item.name} ${item.surname}`,
  }));
  const feeItemOptions = feeItems.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const renderRow = (item: Invoice) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.invoiceNo}</td>
      <td>{item.studentName}</td>
      <td>{item.feeItem}</td>
      <td>{formatMoney(item.amount)}</td>
      <td className="hidden md:table-cell">{formatMoney(item.paid)}</td>
      <td className="hidden lg:table-cell">{formatDate(item.dueDate)}</td>
      <td>
        <span
          className={`px-2 py-1 rounded-md text-xs font-semibold ${statusColor(item.status)}`}
        >
          {item.status}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal
            table="invoice"
            type="update"
            data={item}
            relatedData={{ students: studentOptions, feeItems: feeItemOptions }}
          />
          <FormModal table="invoice" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Invoices</h1>
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
              table="invoice"
              type="create"
              relatedData={{ students: studentOptions, feeItems: feeItemOptions }}
            />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={invoiceData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default InvoiceListPage;
