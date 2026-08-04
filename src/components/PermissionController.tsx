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

const ROLE_HEADERS: { role: Role; label: string }[] = [
  { role: "admin", label: "Admin" },
  { role: "teacher", label: "Teacher" },
  { role: "student", label: "Student" },
  { role: "parent", label: "Parent" },
];

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-kamal-purple",
  teacher: "bg-kamal-sky",
  student: "bg-kamal-yellow",
  parent: "bg-green-400",
};

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

  const toggle = (role: Role, key: PermissionKey, checked: boolean) => {
    // Optimistic update; revert on failure.
    setState((prev) => {
      const next = { ...prev, [role]: [...(prev[role] ?? [])] };
      if (checked && !next[role].includes(key)) next[role].push(key);
      if (!checked) next[role] = next[role].filter((k) => k !== key);
      return next;
    });

    startTransition(async () => {
      const result = await toggleRolePermission(role, key, checked);
      if (!result.success) {
        setState((prev) => {
          const next = { ...prev, [role]: [...(prev[role] ?? [])] };
          if (!checked && !next[role].includes(key)) next[role].push(key);
          if (checked) next[role] = next[role].filter((k) => k !== key);
          return next;
        });
        toast.error(result.error ?? "Could not update permission.");
      }
    });
  };

  const has = (role: Role, key: PermissionKey) =>
    (state[role] ?? []).includes(key);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Permission Controller</h1>
        <span className="text-xs text-gray-400">
          Toggle which permissions each role holds. Admin keeps every permission.
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-medium text-gray-500">
                Permission
              </th>
              {ROLE_HEADERS.filter((h) => roles.includes(h.role)).map((h) => (
                <th key={h.role} className="p-2 font-medium text-gray-500 text-center">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-white text-xs ${ROLE_COLORS[h.role]}`}
                  >
                    {h.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <Fragment key={category}>
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="p-2 pt-4 text-xs font-semibold uppercase tracking-wide text-gray-400"
                  >
                    {category}
                  </td>
                </tr>
                {permissions
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <tr
                      key={p.key}
                      className="border-b border-gray-100 hover:bg-kamal-sky-light"
                    >
                      <td className="p-2 font-medium">{p.label}</td>
                      {ROLE_HEADERS.filter((h) => roles.includes(h.role)).map((h) => (
                        <td key={h.role} className="p-2 text-center">
                          <button
                            type="button"
                            disabled={pending || h.role === "admin"}
                            onClick={() => toggle(h.role, p.key, !has(h.role, p.key))}
                            aria-label={`${p.label} for ${h.label}`}
                            className={`w-10 h-5 rounded-full relative transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                              has(h.role, p.key) ? "bg-kamal-purple" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                has(h.role, p.key) ? "translate-x-5" : ""
                              }`}
                            />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionController;
