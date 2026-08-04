import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  quantity: number;
  location: string | null;
  description: string | null;
};

const baseColumns = [
  { header: "Name", accessor: "name" },
  { header: "Category", accessor: "category" },
  { header: "Quantity", accessor: "quantity" },
  { header: "Location", accessor: "location", className: "hidden md:table-cell" },
  { header: "Description", accessor: "description", className: "hidden lg:table-cell" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const lowStock = (quantity: number) => quantity <= 5;

const InventoryPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("inventory.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.InventoryItemWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { name: { contains: param, mode: "insensitive" } },
          { category: { contains: param, mode: "insensitive" } },
        ];
        break;
      default:
        break;
    }
  }

  const [items, count, lowStockCount] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: query,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.inventoryItem.count({ where: query }),
    prisma.inventoryItem.count({ where: { quantity: { lte: 5 } } }),
  ]);

  const itemData: InventoryItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    location: item.location,
    description: item.description,
  }));

  const renderRow = (item: InventoryItem) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.name}</td>
      <td>{item.category}</td>
      <td>
        <span
          className={`px-2 py-1 rounded-md text-xs font-semibold ${
            lowStock(item.quantity)
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {item.quantity}
        </span>
      </td>
      <td className="hidden md:table-cell">{item.location || "—"}</td>
      <td className="hidden lg:table-cell">{item.description || "—"}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal table="inventoryItem" type="update" data={item} />
          <FormModal table="inventoryItem" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Inventory</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <a
              href="/list/inventory/issues"
              className="px-3 py-2 rounded-md text-sm font-medium text-white bg-kamal-purple hover:opacity-90"
            >
              Issues
            </a>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal table="inventoryItem" type="create" />
          </div>
        </div>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        {lowStockCount} item{lowStockCount === 1 ? " is" : "s are"} running low
        (quantity ≤ 5).
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={itemData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default InventoryPage;
