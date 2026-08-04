import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Payment = {
  id: number;
  invoiceNo: string;
  studentName: string;
  amount: number;
  method: string;
  date: Date;
  reference: string | null;
};

const baseColumns = [
  { header: "Invoice", accessor: "invoiceNo" },
  { header: "Student", accessor: "studentName" },
  { header: "Amount", accessor: "amount" },
  { header: "Method", accessor: "method" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Reference", accessor: "reference", className: "hidden lg:table-cell" },
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

const PaymentListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("payments.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.PaymentWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { invoice: { invoiceNo: { contains: param, mode: "insensitive" } } },
          {
            invoice: {
              student: { name: { contains: param, mode: "insensitive" } },
            },
          },
          { reference: { contains: param, mode: "insensitive" } },
        ];
        break;
      default:
        break;
    }
  }

  const [payments, count] = await Promise.all([
    prisma.payment.findMany({
      where: query,
      include: {
        invoice: {
          include: { student: { select: { name: true, surname: true } } },
        },
      },
      orderBy: [{ date: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.payment.count({ where: query }),
  ]);

  const paymentData: Payment[] = payments.map((item) => ({
    id: item.id,
    invoiceNo: item.invoice.invoiceNo,
    studentName: `${item.invoice.student.name} ${item.invoice.student.surname}`,
    amount: Number(item.amount),
    method: item.method,
    date: item.date,
    reference: item.reference,
  }));

  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNo: true, status: true },
    where: { status: { in: ["Unpaid", "Partial"] } },
    orderBy: { invoiceNo: "asc" },
  });
  const invoiceOptions = invoices.map((invoice) => ({
    value: invoice.id,
    label: invoice.invoiceNo,
  }));

  const renderRow = (item: Payment) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.invoiceNo}</td>
      <td>{item.studentName}</td>
      <td>{formatMoney(item.amount)}</td>
      <td>{item.method}</td>
      <td className="hidden md:table-cell">{formatDate(item.date)}</td>
      <td className="hidden lg:table-cell">{item.reference || "—"}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal
            table="payment"
            type="update"
            data={item}
            relatedData={{ invoices: invoiceOptions }}
          />
          <FormModal table="payment" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Payments</h1>
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
              table="payment"
              type="create"
              relatedData={{ invoices: invoiceOptions }}
            />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={paymentData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default PaymentListPage;
