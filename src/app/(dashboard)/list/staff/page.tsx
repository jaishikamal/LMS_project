import FormModal from "@/components/FormModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import Image from "next/image";

type StaffMember = {
  id: string;
  name: string;
  surname: string;
  role: string;
  department: string;
  phone: string | null;
  email: string | null;
  img: string | null;
  joinDate: Date;
  createdAt: Date;
};

const baseColumns = [
  { header: "Name", accessor: "name" },
  { header: "Department", accessor: "department", className: "hidden md:table-cell" },
  { header: "Phone", accessor: "phone", className: "hidden md:table-cell" },
  { header: "Email", accessor: "email", className: "hidden lg:table-cell" },
  { header: "Joined", accessor: "joinDate", className: "hidden lg:table-cell" },
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

const StaffListPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  await requirePermission("staff.view");
  const { page: pageParam, ...queryParams } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const query: Prisma.StaffWhereInput = {};

  for (const [rawKey, value] of Object.entries(queryParams)) {
    if (!value) continue;
    const param = (Array.isArray(value) ? value[0] : value).trim();
    if (!param) continue;

    switch (rawKey.toLowerCase()) {
      case "search":
        query.OR = [
          { name: { contains: param, mode: "insensitive" } },
          { surname: { contains: param, mode: "insensitive" } },
          { role: { contains: param, mode: "insensitive" } },
          { department: { contains: param, mode: "insensitive" } },
        ];
        break;
      default:
        break;
    }
  }

  const [staff, count] = await Promise.all([
    prisma.staff.findMany({
      where: query,
      select: {
        id: true,
        name: true,
        surname: true,
        role: true,
        department: true,
        phone: true,
        email: true,
        img: true,
        joinDate: true,
        createdAt: true,
      },
      orderBy: [{ department: "asc" }, { name: "asc" }],
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (page - 1),
    }),
    prisma.staff.count({ where: query }),
  ]);

  const staffData: StaffMember[] = staff.map((item) => ({
    id: item.id,
    name: item.name,
    surname: item.surname,
    role: item.role,
    department: item.department,
    phone: item.phone,
    email: item.email,
    img: item.img,
    joinDate: item.joinDate,
    createdAt: item.createdAt,
  }));

  const renderRow = (item: StaffMember) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-kamal-purple-light"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/avatar.png"}
          alt=""
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <span className="font-medium">{item.name} {item.surname}</span>
          <span className="text-xs text-gray-500">{item.role}</span>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.department}</td>
      <td className="hidden md:table-cell">{item.phone || "—"}</td>
      <td className="hidden lg:table-cell">{item.email || "—"}</td>
      <td className="hidden lg:table-cell">{formatDate(item.joinDate)}</td>
      <td>
        <div className="flex items-center gap-2">
          <FormModal table="staff" type="update" data={item} />
          <FormModal table="staff" type="delete" id={item.id} />
        </div>
      </td>
    </tr>
  );

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">Staff Directory</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/filter.png" alt="" width={14} height={14} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full bg-kamal-yellow">
              <Image src="/sort.png" alt="" width={14} height={14} />
            </button>
            <FormModal table="staff" type="create" />
          </div>
        </div>
      </div>
      <Table columns={[...baseColumns, actionColumn]} renderRow={renderRow} data={staffData} />
      <Pagination page={page} count={count} />
    </div>
  );
};

export default StaffListPage;
