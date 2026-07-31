"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TableSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const value = (e.currentTarget.elements.namedItem("search") as HTMLInputElement)
      .value.trim();

    const params = new URLSearchParams(searchParams);

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    // Reset to the first page whenever the search term changes
    params.delete("page");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2"
    >
      <button type="submit" aria-label="Search">
        <Image src="/search.png" alt="" width={14} height={14} />
      </button>
      <input
        type="text"
        name="search"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search..."
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </form>
  );
};

export default TableSearch;
