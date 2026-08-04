import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type FeeItem = {
  id: number;
  name: string;
  amount: number;
  className: string | null;
};

const baseColumns = [
  { header: "Name", accessor: "name" },
  { header: "Amount", accessor: "amount" },
  { header: "Class", accessor: "className" },
];

const actionColumn = {
  header: "Actions",
  accessor: "action",
};

const formatMoney = (value: number) =>
  `रु ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const FeeListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("fees.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.FeeItemWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [{ name: { contains: param, mode: "insensitive" } }];
        break;
      default:
        break;
    }
  }

  const [fees, count] = await Promise.all([
    prisma.feeItem.findMany({
      where: query,
      include: { class: true },
      orderBy: [{ name: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.feeItem.count({ where: query }),
  ]);

  const feeData: FeeItem[] = fees.map((item) => ({
    id: item.id,
    name: item.name,
    amount: Number(item.amount),
    className: item.class?.name ?? "Whole school",
  }));

  const classes = await prisma.class.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const classOptions = classes.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const renderRow = (item: FeeItem) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="p-4 font-medium">{item.name}</td>
      <td>{formatMoney(item.amount)}</td>
      <td>{item.className}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal
            table="feeItem"
            type="update"
            data={item}
            relatedData={{ classes: classOptions }}
          />
          <FormModal table="feeItem" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Fee Structure</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal table="feeItem" type="create" relatedData={{ classes: classOptions }} />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={feeData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default FeeListPage;
