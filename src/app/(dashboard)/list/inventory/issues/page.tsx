import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type Issue = {
  id: number;
  itemName: string;
  borrowerType: string;
  borrowerName: string;
  issuedDate: Date;
  dueDate: Date;
  returnedDate: Date | null;
  status: string;
};

const baseColumns = [
  { header: "Item", accessor: "itemName" },
  { header: "Borrower", accessor: "borrowerName" },
  { header: "Type", accessor: "borrowerType" },
  { header: "Issued", accessor: "issuedDate", className: "hidden md:table-cell" },
  { header: "Due", accessor: "dueDate", className: "hidden md:table-cell" },
  { header: "Status", accessor: "status" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const formatDate = (value: Date | null) => {
  if (!value) return "—";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const statusInfo = (item: Issue): { label: string; className: string } => {
  if (item.status === "Returned") {
    return { label: "Returned", className: "bg-green-100 text-green-800" };
  }
  const overdue = item.dueDate.getTime() < Date.now();
  return overdue
    ? { label: "Overdue", className: "bg-red-100 text-red-800" }
    : { label: "Issued", className: "bg-yellow-100 text-yellow-800" };
};

const IssueListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("inventory.issue.manage");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.InventoryIssueWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { borrowerName: { contains: param, mode: "insensitive" } },
          { item: { name: { contains: param, mode: "insensitive" } } },
        ];
        break;
      default:
        break;
    }
  }

  const [issues, count] = await Promise.all([
    prisma.inventoryIssue.findMany({
      where: query,
      include: { item: { select: { name: true } } },
      orderBy: [{ issuedDate: "desc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.inventoryIssue.count({ where: query }),
  ]);

  const issueData: Issue[] = issues.map((item) => ({
    id: item.id,
    itemName: item.item.name,
    borrowerType: item.borrowerType,
    borrowerName: item.borrowerName,
    issuedDate: item.issuedDate,
    dueDate: item.dueDate,
    returnedDate: item.returnedDate,
    status: item.returnedDate ? "Returned" : "Issued",
  }));

  const items = await prisma.inventoryItem.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const itemOptions = items.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const renderRow = (item: Issue) => {
    const status = statusInfo(item);
    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
      >
        <td className="p-4 font-medium">{item.itemName}</td>
        <td>{item.borrowerName}</td>
        <td>{item.borrowerType}</td>
        <td className="hidden md:table-cell">{formatDate(item.issuedDate)}</td>
        <td className="hidden md:table-cell">{formatDate(item.dueDate)}</td>
        <td>
          <span
            className={`px-2 py-1 rounded-md text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </td>
        <td>
          <div className="flex items-center gap-2">
            <FormModal
              table="inventoryIssue"
              type="update"
              data={item}
              relatedData={{ inventoryItems: itemOptions }}
            />
            <FormModal table="inventoryIssue" type="delete" id={item.id} />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          Inventory Issues
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <a
              href="/list/inventory"
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-kamal-purple hover:opacity-90"
            >
              Items
            </a>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal
              table="inventoryIssue"
              type="create"
              relatedData={{ inventoryItems: itemOptions }}
            />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={issueData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default IssueListPage;
