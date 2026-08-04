import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Expense = {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: Date;
  notes: string | null;
};

const baseColumns = [
  { header: "Title", accessor: "title" },
  { header: "Category", accessor: "category" },
  { header: "Amount", accessor: "amount" },
  { header: "Date", accessor: "date", className: "hidden md:table-cell" },
  { header: "Notes", accessor: "notes", className: "hidden lg:table-cell" },
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

const ExpenseListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("expenses.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.ExpenseWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { title: { contains: param, mode: "insensitive" } },
          { category: { contains: param, mode: "insensitive" } },
        ];
        break;
      default:
        break;
    }
  }

  const [expenses, count, total] = await Promise.all([
    prisma.expense.findMany({
      where: query,
      orderBy: [{ date: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.expense.count({ where: query }),
    prisma.expense.aggregate({ where: query, _sum: { amount: true } }),
  ]);

  const expenseData: Expense[] = expenses.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    amount: Number(item.amount),
    date: item.date,
    notes: item.notes,
  }));

  const renderRow = (item: Expense) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.title}</td>
      <td>{item.category}</td>
      <td>{formatMoney(item.amount)}</td>
      <td className="hidden md:table-cell">{formatDate(item.date)}</td>
      <td className="hidden lg:table-cell">{item.notes || "—"}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal table="expense" type="update" data={item} />
          <FormModal table="expense" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Expenses</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal table="expense" type="create" />
          </div>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        Total (filtered):{" "}
        <span className="font-semibold">
          {formatMoney(Number(total._sum.amount ?? 0))}
        </span>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={expenseData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default ExpenseListPage;
