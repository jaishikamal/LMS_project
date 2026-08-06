"use client";

import { Fragment, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { toggleRolePermission } from "@/lib/actions";
import type { PermissionKey } from "@/lib/permissions";
import type { Role } from "@/lib/roles";

type PermissionRow = {
  key: PermissionKey;
  label: string;
  category: string;
};

const ROLE_HEADER_LIST: { role: Role; label: string; badgeStyle: string }[] = [
  { role: "admin", label: "Admin", badgeStyle: "bg-purple-100 text-purple-800 border-purple-200" },
  { role: "teacher", label: "Teacher", badgeStyle: "bg-sky-100 text-sky-800 border-sky-200" },
  { role: "student", label: "Student", badgeStyle: "bg-amber-100 text-amber-800 border-amber-200" },
  { role: "parent", label: "Parent", badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-200" },
];

const PermissionController = ({
  roles,
  categories,
  permissions,
  assignments,
}: {
  roles: Role[];
  categories: string[];
  permissions: PermissionRow[];
  assignments: Record<string, PermissionKey[]>;
}) => {
  const [state, setState] = useState<Record<string, PermissionKey[]>>(
    Object.fromEntries(roles.map((role) => [role, assignments[role] ?? []]))
  );
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");

  const toggle = (role: Role, key: PermissionKey, checked: boolean) => {
    if (role === "admin") return;

    // Optimistic update
    setState((prev) => {
      const next = { ...prev, [role]: [...(prev[role] ?? [])] };
      if (checked && !next[role].includes(key)) next[role].push(key);
      if (!checked) next[role] = next[role].filter((k) => k !== key);
      return next;
    });

    startTransition(async () => {
      const result = await toggleRolePermission(role, key, checked);
      if (!result.success) {
        // Revert on error
        setState((prev) => {
          const next = { ...prev, [role]: [...(prev[role] ?? [])] };
          if (!checked && !next[role].includes(key)) next[role].push(key);
          if (checked) next[role] = next[role].filter((k) => k !== key);
          return next;
        });
        toast.error(result.error ?? "Failed to update permission");
      }
    });
  };

  const has = (role: Role, key: PermissionKey) =>
    role === "admin" || (state[role] ?? []).includes(key);

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch =
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "ALL" || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 bg-gray-50/50 min-h-full space-y-6">
      {/* PAGE TITLE & SUMMARY */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Role & Permission Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Control feature access and security capabilities for Admin, Teacher, Student, and Parent roles.
          </p>
        </div>

        {/* ROLE METRIC CARDS */}
        <div className="flex flex-wrap items-center gap-2">
          {ROLE_HEADER_LIST.filter((h) => roles.includes(h.role)).map((h) => {
            const count =
              h.role === "admin"
                ? permissions.length
                : (state[h.role] ?? []).filter((k) => permissions.some((p) => p.key === k)).length;
            return (
              <div
                key={h.role}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs"
              >
                <span className={`px-2 py-0.5 rounded-md font-semibold border ${h.badgeStyle}`}>
                  {h.label}
                </span>
                <span className="font-medium text-gray-700">{count} active</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND CATEGORY FILTER */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* SEARCH BAR */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* CATEGORY BUTTONS */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategory("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
              activeCategory === "ALL"
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PERMISSIONS TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[240px]">Permission</th>
                <th className="py-3 px-4 min-w-[140px]">Identifier</th>
                {ROLE_HEADER_LIST.filter((h) => roles.includes(h.role)).map((h) => (
                  <th key={h.role} className="py-3 px-4 text-center min-w-[100px]">
                    <span className={`inline-block px-2.5 py-1 rounded-md border font-semibold ${h.badgeStyle}`}>
                      {h.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => {
                const categoryPerms = filteredPermissions.filter(
                  (p) => p.category === category
                );
                if (categoryPerms.length === 0) return null;

                return (
                  <Fragment key={category}>
                    {/* CATEGORY SECTION HEADER */}
                    <tr className="bg-gray-50/70 font-semibold text-gray-700 border-y border-gray-200">
                      <td colSpan={roles.length + 2} className="py-2 px-4 uppercase tracking-wider text-[11px] text-gray-500">
                        {category} ({categoryPerms.length})
                      </td>
                    </tr>

                    {/* PERMISSION ITEMS */}
                    {categoryPerms.map((p) => (
                      <tr key={p.key} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-800">
                          {p.label}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                          {p.key}
                        </td>

                        {ROLE_HEADER_LIST.filter((h) => roles.includes(h.role)).map((h) => {
                          const isGranted = has(h.role, p.key);
                          const isAdmin = h.role === "admin";

                          return (
                            <td key={h.role} className="py-3 px-4 text-center">
                              {isAdmin ? (
                                <span className="inline-block px-2 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-50 rounded border border-purple-200">
                                  Full Access
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => toggle(h.role, p.key, !isGranted)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                                    isGranted ? "bg-purple-600" : "bg-gray-300"
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                      isGranted ? "translate-x-4" : "translate-x-0"
                                    }`}
                                  />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PermissionController;
