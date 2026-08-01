"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 300;

const TableSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("search") ?? "";

  // Controlled so every keystroke re-renders the input immediately; the URL
  // update is what gets debounced, not the visible typing.
  const [value, setValue] = useState(urlValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync if the URL changes from elsewhere (e.g. browser
  // back/forward, or navigating to a different list page).
  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  const pushSearch = (raw: string) => {
    const trimmed = raw.trim();
    const params = new URLSearchParams(searchParams);

    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }

    // Reset to the first page whenever the search term changes
    params.delete("page");

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValue(next);

    // Search as you type, letter by letter, without spamming navigation on
    // every keystroke.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => pushSearch(next), DEBOUNCE_MS);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Pressing Enter or clicking the search icon applies immediately,
    // bypassing the debounce.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushSearch(value);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
        value={value}
        onChange={handleChange}
        placeholder="Search..."
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </form>
  );
};

export default TableSearch;
